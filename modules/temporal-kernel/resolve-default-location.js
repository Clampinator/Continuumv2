/**
 * TEMPORAL KERNEL: RESOLVE DEFAULT LOCATION
 * Pure function. Reverse-walks sorted history to find the most recent
 * location (with geo coordinates) at or before a target subjective age.
 *
 * Priority matches findLastKnownLocation and resolveLocationContext:
 *   1. Level event: eventLocation
 *   2. Span arrival: eventSpanToLocation (the "new reality" after spanning)
 *   3. Span departure: eventSpanFromLocation (fallback)
 *
 * Returns the location string AND the associated lat/lng/zoom from the
 * same event that provided the location string, so downstream consumers
 * can pre-fill both the label and the map pin.
 *
 * @param {Array} history - Sorted fact array from getActorHistory().
 *   Each fact has { id, sort, record: { eventAge, eventLocation, lat, lng, zoom, ... } }.
 * @param {number} targetAge - Subjective age (seconds since birth) to resolve from.
 * @param {Object} actor - Optional Foundry Actor for birthLocation fallback.
 * @returns {{ location: string, lat: number|null, lng: number|null, zoom: number|null }}
 */
export function resolveDefaultLocation(history, targetAge, actor = null) {
  const UNKNOWN = { location: 'Unknown', lat: null, lng: null, zoom: null };

  if (!history || history.length === 0) {
    return applyFallback(UNKNOWN, actor);
  }

  // Filter events at or before the target age
  const pastEvents = history.filter(e => {
    const age = Number(e.record?.eventAge || e.age || 0);
    return age <= targetAge;
  });

  // Sort descending by age then sort to walk backward from target
  pastEvents.sort((a, b) => {
    const ageA = Number(a.record?.eventAge || a.age || 0);
    const ageB = Number(b.record?.eventAge || b.age || 0);
    const ageDiff = ageB - ageA;
    if (ageDiff !== 0) return ageDiff;
    return (Number(b.sort) || 0) - (Number(a.sort) || 0);
  });

  for (const event of pastEvents) {
    const rec = event.record || event;

    // Level event location
    if (rec.eventLocation && rec.eventLocation.trim() !== '') {
      return {
        location: rec.eventLocation.trim(),
        lat: rec.lat ?? null,
        lng: rec.lng ?? null,
        zoom: rec.zoom ?? null
      };
    }

    // Span arrival location (the "new reality")
    if (rec.eventIsSpan && rec.eventSpanToLocation && rec.eventSpanToLocation.trim() !== '') {
      return {
        location: rec.eventSpanToLocation.trim(),
        lat: rec.eventSpanToLat ?? null,
        lng: rec.eventSpanToLng ?? null,
        zoom: rec.eventSpanToZoom ?? null
      };
    }

    // Span departure location (fallback)
    if (rec.eventIsSpan && rec.eventSpanFromLocation && rec.eventSpanFromLocation.trim() !== '') {
      return {
        location: rec.eventSpanFromLocation.trim(),
        lat: rec.eventSpanFromLat ?? null,
        lng: rec.eventSpanFromLng ?? null,
        zoom: rec.eventSpanFromZoom ?? null
      };
    }
  }

  // No location found in history - try actor birth location
  return applyFallback(UNKNOWN, actor);
}

/**
 * Applies actor birthLocation fallback when no history location is found.
 * Birth location has no geo coordinates.
 */
function applyFallback(result, actor) {
  if (result.location === 'Unknown' && actor?.system?.personal?.birthLocation) {
    const trimmed = actor.system.personal.birthLocation.trim();
    if (trimmed) {
      return { location: trimmed, lat: null, lng: null, zoom: null };
    }
  }
  return result;
}