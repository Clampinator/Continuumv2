/**
 * TEMPORAL KERNEL: SOLVE HISTORY PHYSICS
 * Pure mathematical walk through the character's journey.
 * ENFORCES: Birth Node Authority (Age 0 = dobTime).
 */
export function solveHistoryPhysics(history, dobTime) {
    const shifts = {};
    
    // 1. Prepare history for the walk
    const sorted = [...history].filter(n => !n.isNow && !n.isVirtual && !n.isBirth)
                               .sort((a, b) => (a.sort || 0) - (b.sort || 0));

    if (sorted.length === 0) return shifts;

    // RULE: BIRTH ANCHOR AUTHORITY
    // All age calculations begin at the character's Date of Birth.
    let objectiveOffset = Number(dobTime) || 0;

    // 2. The Compensation Wave
    for (const node of sorted) {
        const ev = node.record;
        
        // Physics X: Subjective Age
        const fromTs = Number(node.y);
        const savedAge = Number(node.x);
        
        // Calculate the only mathematically possible Age for this timestamp
        // based on the birth anchor and preceding spans.
        const calculatedAge = Math.max(0, (fromTs - objectiveOffset) / 1000);

        // AUTHORITY: Only apply shift if drift is significant (> 100ms)
        if (Math.abs(calculatedAge - savedAge) > 0.1) {
            shifts[node.id] = calculatedAge;
        }

        // Arrival Physics (The "Offset" shift)
        if (ev.isSpan) {
            // Spans shift the "World Clock" relative to the "Character Clock"
            const arrivalTs = Number(node.arrivalY || node.y); 
            const effectiveAge = shifts[node.id] !== undefined ? shifts[node.id] : savedAge;
            objectiveOffset = arrivalTs - (effectiveAge * 1000);
        }
    }

    return shifts;
}
