/**
 * KERNEL: VERIFY SPAN COORDINATES
 * Post-save defense mechanism that checks whether committed DB values
 * match the intended coordinates from the interaction layer.
 *
 * After a span event is saved, this function compares the committed ts/arrivalTs
 * against the target values from the drag state. If drift exceeds a tolerance
 * (1000ms), it logs a warning. This should NEVER fire in normal operation -
 * if it does, there's a TTL round-trip bug.
 *
 * This is a verification function, NOT a correction loop. It reads committed
 * values and reports discrepancies; it never modifies data.
 *
 * @param {Object} committed - The record as written to the DB
 * @param {number} committed.ts - Departure timestamp (epoch ms)
 * @param {number} committed.arrivalTs - Arrival timestamp (epoch ms)
 * @param {number} committed.eventAge - Subjective age (seconds)
 * @param {Object} target - The intended coordinates from the interaction
 * @param {number} target.ts - Intended departure timestamp (epoch ms)
 * @param {number} target.arrivalTs - Intended arrival timestamp (epoch ms)
 * @param {number} target.eventAge - Intended subjective age (seconds)
 * @param {string} target.id - Event ID for logging
 * @param {number} [toleranceMs=1000] - Maximum acceptable drift in ms
 * @returns {{ verified: boolean, driftTs: number, driftArrivalTs: number, driftAge: number }}
 */
export function verifySpanCoordinates(committed, target, toleranceMs = 1000) {
    const driftTs = Math.abs(Number(committed.ts) - Number(target.ts));
    const driftArrivalTs = Math.abs(Number(committed.arrivalTs) - Number(target.arrivalTs));
    const driftAge = Math.abs(Number(committed.eventAge) - Number(target.eventAge));

    if (driftTs > toleranceMs || driftArrivalTs > toleranceMs || driftAge > 1) {
        console.warn('[VERIFY-SPAN] Coordinate drift detected!', {
            id: target.id,
            committed: { ts: committed.ts, arrivalTs: committed.arrivalTs, eventAge: committed.eventAge },
            target: { ts: target.ts, arrivalTs: target.arrivalTs, eventAge: target.eventAge },
            drift: { driftTs, driftArrivalTs, driftAge },
            toleranceMs
        });
        return { verified: false, driftTs, driftArrivalTs, driftAge };
    }

    return { verified: true, driftTs, driftArrivalTs, driftAge };
}