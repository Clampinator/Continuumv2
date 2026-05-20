/**
 * TEMPORAL TRANSLATOR: LOCATION RESOLVER
 * Authoritative module for establishing the character's physical context
 * and mapping locations to IANA timezones.
 *
 * Delegates the reverse-walk location resolution to the Kernel's
 * resolveDefaultLocation, then adds timezone mapping on top.
 *
 * ENFORCES: Historical Reverse-Walk Authority.
 * FORBIDDEN: UTC/System clock defaults unless no history exists.
 */

import { resolveDefaultLocation } from '../temporal-kernel/resolve-default-location.js';

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
 * Delegates the reverse-walk to resolveDefaultLocation (Kernel) which uses
 * the canonical priority: eventLocation > eventSpanToLocation > eventSpanFromLocation.
 * Adds timezone mapping on top for TTL consumers that need IANA timezone IDs.
 *
 * @param {Array} history - Array of standardized Fact records.
 * @param {number} targetAge - Subjective Age (s) to resolve context for.
 * @param {Object} actor - (Optional) Foundry Actor for Birth Location fallback.
 * @returns {Object} { location: string, timezone: string, offset: number|null }
 */
export function resolveLocationContext(history, targetAge, actor = null) {
    // Delegate reverse-walk to Kernel's resolveDefaultLocation.
    // It handles the full priority chain + birth location fallback.
    const result = resolveDefaultLocation(history, targetAge, actor);

    // Map location name to IANA timezone
    const normalized = result.location.toLowerCase();
    const timezone = MAP_LOCATION_TO_TIMEZONE[normalized] || "UTC";

    return {
        location: result.location,
        timezone: timezone,
        offset: null
    };
}