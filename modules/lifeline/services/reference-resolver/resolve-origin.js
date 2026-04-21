
/**
 * Resolves the origin (Birth/Inception) timestamp for an actor.
 * Enforces valid numeric output to prevent graph calculation errors.
 * @param {object} actor - The Foundry actor instance.
 * @returns {number} Timestamp in milliseconds.
 */
export function resolveOrigin(actor) {
    if (!actor) return Date.now();

    const system = actor.system;
    const dobString = system.personal?.dob || system.structure?.inceptionDate;
    
    if (dobString) {
        // Append T12:00:00Z to match the default precision of parseDate
        const dobDate = new Date(dobString + "T12:00:00Z");
        if (!isNaN(dobDate.getTime())) return dobDate.getTime();
    }

    // Fallback: Use creation time if available, otherwise current system time
    return actor.creationTime || Date.now();
}
