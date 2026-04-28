/**
 * TEMPORAL TRANSLATOR: LOCATION RESOLVER
 * Authoritative module for establishing the character's physical context
 * and mapping locations to IANA timezones.
 * 
 * ENFORCES: Historical Reverse-Walk Authority.
 * FORBIDDEN: UTC/System clock defaults unless no history exists.
 */

const MAP_LOCATION_TO_TIMEZONE = {
    "london": "Europe/London",
    "paris": "Europe/Paris",
    "new york": "America/New_York",
    "new york city": "America/New_York",
    "nyc": "America/New_York",
    "los angeles": "America/Los_Angeles",
    "la": "America/Los_Angeles",
    "tokyo": "Asia/Tokyo",
    "berlin": "Europe/Berlin",
    "san francisco": "America/Los_Angeles",
    "sf": "America/Los_Angeles",
    "chicago": "America/Chicago",
    "moscow": "Europe/Moscow",
    "beijing": "Asia/Shanghai",
    "hong kong": "Asia/Hong_Kong",
    "sydney": "Australia/Sydney",
    "rome": "Europe/Rome",
    "madrid": "Europe/Madrid"
};

/**
 * Resolves the LocationContext (Location + Timezone) for a given point in history.
 * 
 * @param {Array} history - Array of standardized Fact records.
 * @param {number} targetAge - Subjective Age (s) to resolve context for.
 * @param {Object} actor - (Optional) Foundry Actor for Birth Location fallback.
 * @returns {Object} { location: string, timezone: string, offset: number|null }
 */
export function resolveLocationContext(history, targetAge, actor = null) {
    let locationName = "Unknown";

    // 1. PERFORM THE REVERSE WALK
    // Filter events that occurred at or before the target age
    const pastEvents = (history || []).filter(e => (Number(e.age) || 0) <= targetAge);

    // Sort descending by Age and Sort value to walk backward from the target point
    pastEvents.sort((a, b) => {
        const ageDiff = (Number(b.age) || 0) - (Number(a.age) || 0);
        if (ageDiff !== 0) return ageDiff;
        return (Number(b.sort) || 0) - (Number(a.sort) || 0);
    });

    for (const event of pastEvents) {
        const record = event.record || event;
        
        // RULE: Spans establishment of a new baseline location. 
        // Arrival location is the "New Reality".
        if (record.eventIsSpan && record.eventSpanToLocation?.trim()) {
            locationName = record.eventSpanToLocation.trim();
            break;
        }
        
        // Normal event location marker
        if (record.eventLocation?.trim()) {
            locationName = record.eventLocation.trim();
            break;
        }

        // Span departure location (if no arrival was specified)
        if (record.eventIsSpan && record.eventSpanFromLocation?.trim()) {
            locationName = record.eventSpanFromLocation.trim();
            break;
        }
    }

    // 2. APPLY FALLBACKS
    if (locationName === "Unknown" && actor?.system?.personal?.birthLocation) {
        locationName = actor.system.personal.birthLocation.trim();
    }

    // 3. MAP TO TIMEZONE
    const normalized = locationName.toLowerCase();
    const timezone = MAP_LOCATION_TO_TIMEZONE[normalized] || "UTC";

    return {
        location: locationName,
        timezone: timezone,
        offset: null // Manual millisecond offset could be added here for non-standard eras
    };
}
