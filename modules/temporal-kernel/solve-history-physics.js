/**
 * TEMPORAL KERNEL: SOLVE HISTORY PHYSICS
 * Pure mathematical walk through the character's journey.
 * Calculates the Subjective Age (Physics X) for every node based on 
 * its Objective Timestamp (Physics Y) and preceding Span displacements.
 * 
 * @param {Array} history - Flat array of { id, x, y, sort, record }
 * @param {number} dobTime - The birth timestamp (ms).
 * @returns {Object} A map of { recordId: newAge } for all shifted nodes.
 */
export function solveHistoryPhysics(history, dobTime) {
    const shifts = {};
    let objectiveOffset = Number(dobTime) || 0;

    // 1. Ensure absolute sort order for the physical walk
    const sorted = [...history].sort((a, b) => {
        if (a.sort !== b.sort) return a.sort - b.sort;
        return (a.y - b.y); // Fallback to objective time
    });

    // 2. The Compensation Wave
    for (const node of sorted) {
        if (node.isNow) continue; // Now is handled by the State Engine

        const ev = node.record;
        
        // Departure Physics (The "X" start)
        const fromTs = Number(node.y);
        const currentAge = Number(node.x);
        
        // Calculate the only possible mathematical Age for this timestamp
        const calculatedAge = Math.max(0, (fromTs - objectiveOffset) / 1000);

        // If the drift is > 100ms, mark for update to maintain visual integrity
        if (Math.abs(calculatedAge - currentAge) > 0.1) {
            shifts[node.id] = calculatedAge;
        }

        // Arrival Physics (The "Offset" shift)
        if (ev.isSpan) {
            // Spans shift the "World Clock" relative to the "Character Clock"
            const toTs = Number(ev.arrivalTs || node.y); 
            objectiveOffset = toTs - (calculatedAge * 1000);
        }
    }

    return shifts;
}
