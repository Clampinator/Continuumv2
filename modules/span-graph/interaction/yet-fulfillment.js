/**
 * YET FULFILLMENT HANDLER
 * When a Yet node is dragged onto the NOW node, it fulfills the loop:
 * creates a permanent history event at the NOW position and marks the Yet as done.
 
 * This is the spacetime loop closure mechanic - the character has reached
 * the point in their life where the Yet event was always meant to happen.
 * The fulfillment event becomes a permanent record in the history.
 *
 * State layer authority: insertHistoryRow creates the event,
 * markYetFulfilled sets the flag. Both go through the DB.
 */
import { markYetFulfilled } from '/systems/continuum-v2/modules/state/mark-yet-fulfilled.js';
import { insertHistoryRow } from '/systems/continuum-v2/modules/state/insert-history-row.js';

/**
 * Fulfills a Yet by inserting a permanent history row and marking it done.
 *
 * @param {Actor} actor - The Foundry actor
 * @param {string} yetId - The ID of the Yet to fulfill
 * @param {Object} viewport - The SpanGraphViewport (for state access)
 */
export async function fulfillYet(actor, yetId, viewport) {
    const yetData = actor.system.theYet?.[yetId];
    if (!yetData) {
        console.warn('Continuum | Yet fulfillment failed: Yet not found', yetId);
        return;
    }

    // Resolve the NOW node's position for the fulfillment event
    const nowNode = viewport?.latestState?.nowNode;
    if (nowNode) {
        // Find the era and experience containing the NOW node
        const targetEraId = nowNode.eraId || Object.keys(actor.system.eras || {})[0];
        const targetExpId = nowNode.expId || null;

        const record = {
            eventTitle: `Fulfillment: ${yetData.description || 'Yet event'}`,
            eventNotes: 'Closed the spacetime loop by fulfilling the Yet.',
            eventAge: nowNode.x,
            eventIsSpan: false,
            eraId: targetEraId,
            expId: targetExpId,
            isYetFulfillment: true
        };

        await insertHistoryRow(actor, record);
    }

    await markYetFulfilled(actor, yetId);

    ui.notifications.info(
        `Loop Closed: "${yetData.description || 'Yet event'}" fulfilled.`
    );
}