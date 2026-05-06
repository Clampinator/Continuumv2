/**
 * KERNEL: ADJUST SPAN ON DEPARTURE EDIT
 * When the user edits a span's departure node, the arrival must move
 * by the same delta to preserve the span's duration. This is the
 * physical conservation law: editing the departure shifts both ends
 * together; only editing the arrival changes the span length.
 *
 * This rule was previously embedded in update-history-row.js (State layer).
 * It belongs in the Kernel because it is a physics rule.
 *
 * Returns the corrected arrivalTs (unchanged if delta is zero).
 *
 * @param {number} newDepartureTs - New departure timestamp (epoch ms)
 * @param {number} oldDepartureTs - Old departure timestamp (epoch ms)
 * @param {number} oldArrivalTs - Old arrival timestamp (epoch ms)
 * @returns {number} Corrected arrival timestamp (epoch ms)
 */
export function adjustSpanOnDepartureEdit(newDepartureTs, oldDepartureTs, oldArrivalTs) {
    const delta = newDepartureTs - oldDepartureTs;
    if (delta === 0) return oldArrivalTs;
    return oldArrivalTs + delta;
}