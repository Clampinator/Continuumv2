/**
 * Finds the most recent location in the character's history relative to a starting point.
 * 
 * Data shape: getActorHistory() returns flat facts as
 *   { id, sort, record: { eventAge, eventLocation, eventIsSpan, ... }, eraId, expId }
 * NOT top-level fields like e.age or e.eventLocation.
 * 
 * @param {Array} history - Sorted array of fact objects from getActorHistory().
 * @param {number} startAge - The subjective age (seconds from birth) to look back from.
 * @returns {string} The name of the last known location or "Unknown".
 */
export function findLastKnownLocation(history, startAge) {
    if (!history || history.length === 0) return "Unknown";

    // Facts have age in record.eventAge, not top-level .age
    const pastEvents = history.filter(e => {
        const age = Number(e.record?.eventAge || e.age || 0);
        return age <= startAge;
    });

    // Sort descending by age and sort value to walk backward
    pastEvents.sort((a, b) => {
        const ageA = Number(a.record?.eventAge || a.age || 0);
        const ageB = Number(b.record?.eventAge || b.age || 0);
        const ageDiff = ageB - ageA;
        if (ageDiff !== 0) return ageDiff;
        return (Number(b.sort) || 0) - (Number(a.sort) || 0);
    });

    for (const event of pastEvents) {
        const rec = event.record || event;
        // Check for normal event location
        if (rec.eventLocation && rec.eventLocation.trim() !== "") {
            return rec.eventLocation.trim();
        }
        // Check for span destination location
        if (rec.eventIsSpan && rec.eventSpanToLocation && rec.eventSpanToLocation.trim() !== "") {
            return rec.eventSpanToLocation.trim();
        }
        // Check for span origin location
        if (rec.eventIsSpan && rec.eventSpanFromLocation && rec.eventSpanFromLocation.trim() !== "") {
            return rec.eventSpanFromLocation.trim();
        }
    }

    return "Unknown";
}
