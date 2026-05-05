/**
 * STATE: MARK YET FULFILLED
 * Marks a Yet as done in the database. The only authorized way
 * to update the Yet flag - UI must call this function, not actor.update().
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