/**
 * YET FULFILLMENT HANDLER
 * When a Yet node is dragged onto the NOW node, it fulfills the loop:
 * marks the Yet as done and creates a fulfillment event at the NOW position.
 *
 * This is the spacetime loop closure mechanic - the character has reached
 * the point in their life where the Yet event was always meant to happen.
 */
import { convertTimestampToDateString } from '../../span-graph-utils/provide-span-graph-utils.js';

/**
 * Fulfills a Yet by marking it done and creating a fulfillment event.
 *
 * @param {Actor} actor - The Foundry actor
 * @param {string} yetId - The ID of the Yet to fulfill
 * @param {Object} viewport - The SpanGraphViewport (for re-render)
 */
export async function fulfillYet(actor, yetId, viewport) {
    const yetData = actor.system.theYet?.[yetId];
    if (!yetData) {
        console.warn('Continuum | Yet fulfillment failed: Yet not found', yetId);
        return;
    }

    const nowNode = viewport.latestState?.nowNode;
    if (!nowNode) {
        console.warn('Continuum | Yet fulfillment failed: No NOW node');
        return;
    }

    // Mark the Yet as done
    const updates = {
        [`system.theYet.${yetId}.done`]: true
    };

    await actor.update(updates);

    // Notify the user
    ui.notifications.info(
        `Loop Closed: "${yetData.description || 'Yet event'}" fulfilled.`
    );
}