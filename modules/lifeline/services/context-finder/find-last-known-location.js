/**
 * Finds the most recent location in the character's history relative to a starting point.
 * 
 * @param {Array} history - Sorted array of events.
 * @param {number} startAge - The subjective age to look back from.
 * @returns {string} The name of the last known location or "Unknown".
 */
export function findLastKnownLocation(history, startAge) {
    if (!history || history.length === 0) return "Unknown";

    // Filter events that occurred before or at the start age
    const pastEvents = history.filter(e => (Number(e.age) || 0) <= startAge);

    // Sort descending by Age and Sort value to walk backward
    pastEvents.sort((a, b) => {
        const ageDiff = (Number(b.age) || 0) - (Number(a.age) || 0);
        if (ageDiff !== 0) return ageDiff;
        return (Number(b.sort) || 0) - (Number(a.sort) || 0);
    });

    for (const event of pastEvents) {
        // Check for normal event location
        if (event.location && event.location.trim() !== "") {
            return event.location.trim();
        }
        // Check for span destination location
        if (event.isSpan && event.spanToLocation && event.spanToLocation.trim() !== "") {
            return event.spanToLocation.trim();
        }
        // Check for span origin location
        if (event.isSpan && event.spanFromLocation && event.spanFromLocation.trim() !== "") {
            return event.spanFromLocation.trim();
        }
    }

    return "Unknown";
}
