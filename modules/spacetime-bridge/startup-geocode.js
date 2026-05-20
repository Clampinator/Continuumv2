/*
Startup geocode: scans all spaceTimeLinked actors for events that have
location text but no lat/lng coordinates, and resolves them via the
geocode service before rendering begins.

This fixes the cold-start problem: events created before the State
layer's _enrichCoordinates was added still have null lat/lng. This
module geocodes them once at SpaceTime bridge init so the overlay,
markers, and keyframes all have coordinate data from the start.
*/

import { resolveLocation } from '../state/geocode-service.js';

/*
Scans a single event record for location text without coordinates.
Returns an array of { key, locationText } objects for each missing slot.
*/
function _missingSlots(evt, prefix) {
    const missing = [];

    if (evt.eventLocation?.trim() && (evt.lat == null || evt.lng == null)) {
        missing.push({ key: `${prefix}.lat`, locationText: evt.eventLocation.trim() });
    }

    if (evt.eventIsSpan) {
        if (evt.eventSpanFromLocation?.trim() &&
            (evt.eventSpanFromLat == null || evt.eventSpanFromLng == null)) {
            missing.push({ key: `${prefix}.eventSpanFromLat`, locationText: evt.eventSpanFromLocation.trim() });
        }
        if (evt.eventSpanToLocation?.trim() &&
            (evt.eventSpanToLat == null || evt.eventSpanToLng == null)) {
            missing.push({ key: `${prefix}.eventSpanToLat`, locationText: evt.eventSpanToLocation.trim() });
        }
    }

    return missing;
}

/*
Scans an actor for all events with location text but no coordinates.
Returns { actor, updates, locationTexts } where updates is a {dbPath: value}
object and locationTexts is a Set of unique location strings to geocode.
*/
function _scanActor(actor) {
    const updates = {};
    const locationTexts = new Set();
    // Maps locationText -> [{ dbPath, field }] so we can write results back
    const fieldMap = new Map();

    function addField(locationText, dbPath, latField, lngField, zoomField) {
        locationTexts.add(locationText);
        if (!fieldMap.has(locationText)) fieldMap.set(locationText, []);
        fieldMap.get(locationText).push({ dbPath, latField, lngField, zoomField });
    }

    for (const [eraId, era] of Object.entries(actor.system.eras || {})) {
        for (const [eventId, evt] of Object.entries(era.events || {})) {
            const basePath = `system.eras.${eraId}.events.${eventId}`;
            if (evt.eventLocation?.trim() && (evt.lat == null || evt.lng == null)) {
                addField(evt.eventLocation.trim(), basePath, 'lat', 'lng', 'zoom');
            }
            if (evt.eventIsSpan) {
                if (evt.eventSpanFromLocation?.trim() &&
                    (evt.eventSpanFromLat == null || evt.eventSpanFromLng == null)) {
                    addField(evt.eventSpanFromLocation.trim(), basePath,
                        'eventSpanFromLat', 'eventSpanFromLng', 'eventSpanFromZoom');
                }
                if (evt.eventSpanToLocation?.trim() &&
                    (evt.eventSpanToLat == null || evt.eventSpanToLng == null)) {
                    addField(evt.eventSpanToLocation.trim(), basePath,
                        'eventSpanToLat', 'eventSpanToLng', 'eventSpanToZoom');
                }
            }
        }
        for (const [expId, exp] of Object.entries(era.experiences || {})) {
            for (const [eventId, evt] of Object.entries(exp.events || {})) {
                const basePath = `system.eras.${eraId}.experiences.${expId}.events.${eventId}`;
                if (evt.eventLocation?.trim() && (evt.lat == null || evt.lng == null)) {
                    addField(evt.eventLocation.trim(), basePath, 'lat', 'lng', 'zoom');
                }
                if (evt.eventIsSpan) {
                    if (evt.eventSpanFromLocation?.trim() &&
                        (evt.eventSpanFromLat == null || evt.eventSpanFromLng == null)) {
                        addField(evt.eventSpanFromLocation.trim(), basePath,
                            'eventSpanFromLat', 'eventSpanFromLng', 'eventSpanFromZoom');
                    }
                    if (evt.eventSpanToLocation?.trim() &&
                        (evt.eventSpanToLat == null || evt.eventSpanToLng == null)) {
                        addField(evt.eventSpanToLocation.trim(), basePath,
                            'eventSpanToLat', 'eventSpanToLng', 'eventSpanToZoom');
                    }
                }
            }
        }
    }

    // Birthplace
    const p = actor.system.personal || {};
    if (p.birthLocation?.trim() &&
        (p.birthLat == null || p.birthLng == null)) {
        locationTexts.add(p.birthLocation.trim());
        if (!fieldMap.has(p.birthLocation.trim())) fieldMap.set(p.birthLocation.trim(), []);
        fieldMap.get(p.birthLocation.trim()).push({
            dbPath: 'system.personal', latField: 'birthLat', lngField: 'birthLng', zoomField: null
        });
    }

    return { actor, updates, locationTexts, fieldMap };
}

/*
Geocodes all missing coordinates for spaceTimeLinked actors.
Called once when the SpaceTime bridge initializes.
Uses the shared geocode-service (Location actors -> cache -> Nominatim).
*/
export async function geocodeMissingCoordinates() {
    const actors = game.actors.filter(a => {
        if (!['character', 'organization', 'location'].includes(a.type)) return false;
        if (!(game.user.isGM || a.isOwner)) return false;
        return a.getFlag('continuum-v2', 'spaceTimeLinked') ?? false;
    });

    if (actors.length === 0) return;

    // Scan all actors for missing coordinates
    const scanResults = [];
    let totalMissing = 0;

    for (const actor of actors) {
        const scan = _scanActor(actor);
        if (scan.locationTexts.size > 0) {
            scanResults.push(scan);
            totalMissing += scan.locationTexts.size;
        }
    }

    if (totalMissing === 0) {
        console.debug('[Continuum Bridge] Startup geocode: all actors already have coordinates');
        return;
    }

    console.debug(
        `[Continuum Bridge] Startup geocode: ${totalMissing} unique location(s) need geocoding across ${scanResults.length} actor(s)`
    );

    // Resolve each unique location
    for (const scan of scanResults) {
        const updates = {};

        for (const [locationText, fields] of scan.fieldMap) {
            const geo = await resolveLocation(locationText);
            if (!geo) continue;

            // Write resolved coordinates to all events that use this location
            for (const { dbPath, latField, lngField, zoomField } of fields) {
                updates[`${dbPath}.${latField}`] = geo.lat;
                updates[`${dbPath}.${lngField}`] = geo.lng;
                if (zoomField) updates[`${dbPath}.${zoomField}`] = geo.zoom;
            }
        }

        if (Object.keys(updates).length > 0) {
            await scan.actor.update(updates);
            console.debug(
                `[Continuum Bridge] Startup geocode: ${scan.actor.name} updated ${Object.keys(updates).length} field(s)`
            );
        }
    }
}