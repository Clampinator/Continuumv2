/**
 * KERNEL: ADJUST SPAN ON DEPARTURE EDIT
 * When the user edits a span's departure node, the arrival must move
 * by the same delta to preserve the span's duration. This is the
 * physical conservation law: editing the departure shifts both ends
 * together; only editing the arrival changes the span length.
 *
 * TOLERANCE GUARD: TTL round-trip can introduce micro-drift (timezone
 * rounding, seconds truncation) that makes the departure timestamp shift
 * by a few ms even when the user didn't change the date. If this noise
 * delta were applied to arrivalTs, the compensation wave would propagate
 * the shift through every downstream node. Deltas below MIN_DEPARTURE_DELTA_MS
 * are treated as TTL noise and the arrival is returned unchanged.
 *
 * Returns the corrected arrivalTs (unchanged if delta is below tolerance).
 *
 * @param {number} newDepartureTs - New departure timestamp (epoch ms)
 * @param {number} oldDepartureTs - Old departure timestamp (epoch ms)
 * @param {number} oldArrivalTs - Old arrival timestamp (epoch ms)
 * @param {number} [toleranceMs=1000] - Minimum departure delta to trigger adjustment
 * @returns {{ arrivalTs: number, adjusted: boolean }}
 */
export function adjustSpanOnDepartureEdit(newDepartureTs, oldDepartureTs, oldArrivalTs, toleranceMs = 1000) {
    const delta = newDepartureTs - oldDepartureTs;
    if (Math.abs(delta) < toleranceMs) {
        // Delta below tolerance: treat as TTL noise, preserve original arrival.
        return { arrivalTs: oldArrivalTs, adjusted: false };
    }
    return { arrivalTs: oldArrivalTs + delta, adjusted: true };
}