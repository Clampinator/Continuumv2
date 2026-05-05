/**
 * STATE: MARK YET FULFILLED
 * Marks a Yet as done in the database. This is the flag-only operation.
 * The caller (yet-fulfillment.js) is responsible for also inserting a
 * permanent history row via insertHistoryRow before calling this.
 *
 * @param {Actor} actor - The Foundry actor
 * @param {string} yetId - The ID of the Yet to mark as fulfilled
 */
export async function markYetFulfilled(actor, yetId) {
    if (!actor || !yetId) {
        console.warn('Continuum | markYetFulfilled: missing actor or yetId');
        return;
    }

    const yetData = actor.system.theYet?.[yetId];
    if (!yetData) {
        console.warn('Continuum | markYetFulfilled: Yet not found', yetId);
        return;
    }

    await actor.update({
        [`system.theYet.${yetId}.done`]: true
    });
}