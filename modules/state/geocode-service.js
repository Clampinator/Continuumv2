/*
Geocode Service: resolves location text to lat/lng coordinates.
Used by the State layer (insert/update-history-row) to enrich events
with geographic coordinates before committing to the database.

Architecture: This is a KERNEL service. It sits between the location
text and the database, resolving "Paris, France" -> { lat: 48.8566, lng: 2.3522 }
before the record is written. No UI code calls this directly.

Resolution order:
  1. World Location actors (instant, no API call)
  2. In-memory cache (instant, no API call)
  3. Nominatim API (1-3 seconds, rate-limited)

The cache is keyed on lowercase-trimmed location text, so "Paris, France"
and "paris, france" both hit the cache after the first lookup.
*/

import { geocodeAddress } from '/systems/continuum-v2/modules/lifeline/services/map/nominatim.js';

const GEOCODE_THROTTLE_MS = 1100;
let _lastGeocodeTime = 0;

const _cache = new Map();

/*
Resolves a location text string to { lat, lng, zoom } or null.
Checks Location actors first, then cache, then Nominatim.

@param {string} locationText - The location text to resolve (e.g. "Paris, France")
@returns {Promise<{lat: number, lng: number, zoom: number}|null>}
  Resolved coordinates, or null if the text is empty or resolution fails.
*/
export async function resolveLocation(locationText) {
    if (!locationText?.trim()) return null;
    const key = locationText.trim().toLowerCase();

    // 1. Cache hit
    if (_cache.has(key)) {
        const cached = _cache.get(key);
        return cached === null ? null : { ...cached };
    }

    // 2. World Location actor (instant)
    const fromActor = _resolveFromLocationActor(locationText.trim());
    if (fromActor) {
        _cache.set(key, fromActor);
        return { ...fromActor };
    }

    // 3. Nominatim geocode (rate-limited)
    const result = await _throttledGeocode(locationText.trim());
    if (result) {
        _cache.set(key, result);
        return { ...result };
    }

    // Cache the miss too, so we don't re-query known failures
    _cache.set(key, null);
    return null;
}

/*
Synchronous cache-only lookup. Returns cached result immediately
without hitting Nominatim. Useful when you want best-effort
coordinates without blocking on a network call.

@param {string} locationText - The location text to look up
@returns {{lat: number, lng: number, zoom: number}|null}
  Cached coordinates, or null if not in cache or cache has a miss.
*/
export function resolveLocationCached(locationText) {
    if (!locationText?.trim()) return null;
    const key = locationText.trim().toLowerCase();
    const cached = _cache.get(key);
    if (cached === undefined) return null;
    return cached === null ? null : { ...cached };
}

/*
Pre-seeds the cache with a known location-to-coordinate mapping.
Used by batch-geocode to avoid re-querying locations that have
already been resolved.

@param {string} locationText - The location text
@param {{lat: number, lng: number, zoom: number}|null} result - The resolved coordinates, or null
*/
export function preloadCache(locationText, result) {
    if (!locationText?.trim()) return;
    const key = locationText.trim().toLowerCase();
    if (result) {
        _cache.set(key, result);
    } else {
        _cache.set(key, null);
    }
}

/*
Checks world Location actors for a matching name.
Returns { lat, lng, zoom } or null.
*/
function _resolveFromLocationActor(locationText) {
    if (!locationText) return null;
    if (typeof game === 'undefined' || !game.actors) return null;
    const locationActor = game.actors.find(a =>
        a.type === 'location' &&
        a.name.toLowerCase() === locationText.toLowerCase()
    );
    if (!locationActor) return null;
    const lat = locationActor.system?.map?.lat ?? null;
    const lng = locationActor.system?.map?.lng ?? null;
    if (lat === null || lng === null) return null;
    return { lat, lng, zoom: locationActor.system?.map?.zoom ?? 12 };
}

/*
Throttled Nominatim geocode. Ensures at least GEOCODE_THROTTLE_MS
between API calls to respect Nominatim's usage policy.
*/
async function _throttledGeocode(locationText) {
    const now = Date.now();
    const elapsed = now - _lastGeocodeTime;
    if (elapsed < GEOCODE_THROTTLE_MS) {
        await new Promise(resolve => setTimeout(resolve, GEOCODE_THROTTLE_MS - elapsed));
    }
    _lastGeocodeTime = Date.now();

    try {
        const result = await geocodeAddress(locationText);
        if (!result) return null;
        return {
            lat: result.lat,
            lng: result.lng,
            zoom: result.zoom || 12
        };
    } catch (e) {
        console.warn(`[GeocodeService] Nominatim failed for "${locationText}":`, e);
        return null;
    }
}

/*
Exports the cache size for diagnostics/testing.
*/
export function getCacheSize() {
    return _cache.size;
}