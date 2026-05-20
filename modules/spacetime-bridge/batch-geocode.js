/*
Batch geocode: resolves location text to lat/lng for all events on an actor
that have location text but no coordinates. Uses the shared geocode-service
(Location actors -> cache -> Nominatim) for consistency with the State layer.

Usage:
  import { batchGeocodeActor } from '/systems/continuum-v2/modules/spacetime-bridge/batch-geocode.js';
  await batchGeocodeActor(actor);

Can be called from the console (game.modules.get('continuum-v2').api.batchGeocodeActor(actor)),
a Foundry macro, or wired to a UI button.
*/

import { resolveLocation, preloadCache } from '../state/geocode-service.js';

const GEOCODE_BATCH_SIZE = 5;
const GEOCODE_BATCH_PAUSE_MS = 6000;

/*
Scans an actor's events for location text without coordinates, geocodes
the unique locations via the shared geocode service, and writes
the coordinates back via actor.update().

Also geocodes the actor's birthplace if birthLocation has text but no birthLat/birthLng.

@param {Actor} actor - The Foundry actor to geocode
@returns {{ total: number, resolved: number, geocoded: number, failed: number, updated: number }}
*/
export async function batchGeocodeActor(actor) {
    const eras = actor.system.eras || {};
    const updates = {};
    let totalMissing = 0;
    let updated = 0;
    let resolved = 0;
    let failed = 0;

    // Collect unique location strings and map them to DB update paths
    const uniqueLocations = new Set();
    // Each pending update: { path, latField, lngField, zoomField, locationText }
    const pending = [];

    // Scan era-level events
    for (const [eraId, era] of Object.entries(eras)) {
        for (const [eventId, evt] of Object.entries(era.events || {})) {
            const basePath = `system.eras.${eraId}.events.${eventId}`;
            totalMissing += _collectMissing(evt, basePath, uniqueLocations, pending);
        }
        // Scan experience-level events
        for (const [expId, exp] of Object.entries(era.experiences || {})) {
            for (const [eventId, evt] of Object.entries(exp.events || {})) {
                const basePath = `system.eras.${eraId}.experiences.${expId}.events.${eventId}`;
                totalMissing += _collectMissing(evt, basePath, uniqueLocations, pending);
            }
        }
    }

    // Also check birthplace
    if (actor.system.personal?.birthLocation?.trim() &&
        (actor.system.personal.birthLat == null || actor.system.personal.birthLng == null)) {
        uniqueLocations.add(actor.system.personal.birthLocation.trim());
    }

    if (uniqueLocations.size === 0) {
        ui.notifications?.info(`${actor.name}: All events already have coordinates.`);
        return { total: 0, resolved: 0, geocoded: 0, failed: 0, updated: 0 };
    }

    ui.notifications?.info(`${actor.name}: Geocoding ${uniqueLocations.size} unique location(s)...`);

    // Resolve unique locations using the shared geocode service
    // The service checks Location actors, cache, then Nominatim (with throttling)
    const locationNames = [...uniqueLocations];
    const geoResults = new Map();

    for (let i = 0; i < locationNames.length; i++) {
        // Progress notification for large batches
        if (i > 0 && i % GEOCODE_BATCH_SIZE === 0) {
            ui.notifications?.info(`Batch geocode: ${i}/${locationNames.length} resolved...`);
        }

        const locName = locationNames[i];
        try {
            const result = await resolveLocation(locName);
            if (result) {
                geoResults.set(locName, result);
                preloadCache(locName, result);
                resolved++;
            } else {
                geoResults.set(locName, null);
                failed++;
            }
        } catch (e) {
            console.warn(`[BatchGeocode] Error resolving "${locName}":`, e);
            geoResults.set(locName, null);
            failed++;
        }
    }

    // Apply resolved coordinates to events
    for (const item of pending) {
        const geo = geoResults.get(item.locationText);
        if (geo && geo.lat !== null && geo.lng !== null) {
            updates[`${item.path}.${item.latField}`] = geo.lat;
            updates[`${item.path}.${item.lngField}`] = geo.lng;
            if (item.zoomField) updates[`${item.path}.${item.zoomField}`] = geo.zoom;
            updated++;
        }
    }

    // Birthplace coordinates
    if (actor.system.personal?.birthLocation?.trim()) {
        const birthGeo = geoResults.get(actor.system.personal.birthLocation.trim());
        if (birthGeo && birthGeo.lat !== null) {
            updates['system.personal.birthLat'] = birthGeo.lat;
            updates['system.personal.birthLng'] = birthGeo.lng;
            updated++;
        }
    }

    if (Object.keys(updates).length > 0) {
        await actor.update(updates);
        ui.notifications?.info(
            `${actor.name}: Updated ${updated} coordinate(s).` +
            ` Resolved: ${resolved}, Failed: ${failed}`
        );
    } else {
        ui.notifications?.warn(`${actor.name}: No coordinates could be resolved.`);
    }

    return { total: totalMissing, resolved, geocoded: resolved, failed, updated };
}

/*
Scans a single event record for location text without lat/lng coordinates.
Records each missing coordinate into the pending array and uniqueLocations set.
Returns the number of missing coordinate fields found.
*/
function _collectMissing(evt, basePath, uniqueLocations, pending) {
    let missing = 0;

    // Level event location
    if (evt.eventLocation?.trim() && (evt.lat == null || evt.lng == null)) {
        const locText = evt.eventLocation.trim();
        uniqueLocations.add(locText);
        pending.push({ path: basePath, latField: 'lat', lngField: 'lng', zoomField: 'zoom', locationText: locText });
        missing++;
    }

    // Span departure location
    if (evt.eventIsSpan && evt.eventSpanFromLocation?.trim() &&
        (evt.eventSpanFromLat == null || evt.eventSpanFromLng == null)) {
        const locText = evt.eventSpanFromLocation.trim();
        uniqueLocations.add(locText);
        pending.push({
            path: basePath, latField: 'eventSpanFromLat', lngField: 'eventSpanFromLng',
            zoomField: 'eventSpanFromZoom', locationText: locText
        });
        missing++;
    }

    // Span arrival location
    if (evt.eventIsSpan && evt.eventSpanToLocation?.trim() &&
        (evt.eventSpanToLat == null || evt.eventSpanToLng == null)) {
        const locText = evt.eventSpanToLocation.trim();
        uniqueLocations.add(locText);
        pending.push({
            path: basePath, latField: 'eventSpanToLat', lngField: 'eventSpanToLng',
            zoomField: 'eventSpanToZoom', locationText: locText
        });
        missing++;
    }

    return missing;
}

/*
Convenience: geocode all spaceTime-linked actors at once.
*/
export async function batchGeocodeAllLinked() {
    const actors = game.actors.filter(a => {
        if (!['character', 'organization', 'location'].includes(a.type)) return false;
        return a.getFlag('continuum-v2', 'spaceTimeLinked') ?? false;
    });

    if (actors.length === 0) {
        ui.notifications?.info('No spaceTime-linked actors found.');
        return;
    }

    let totalUpdated = 0;
    for (const actor of actors) {
        const result = await batchGeocodeActor(actor);
        totalUpdated += result.updated;
    }
    ui.notifications?.info(`Batch geocode complete. ${totalUpdated} total coordinate(s) updated across ${actors.length} actor(s).`);
}