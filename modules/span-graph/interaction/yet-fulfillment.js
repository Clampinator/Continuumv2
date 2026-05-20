/**
 * YET FULFILLMENT HANDLER (UI LAYER)
 * When a Yet node is dragged onto the NOW node, it fulfills the loop.
 * This is now a thin UI delegate: it reads the NOW position from the
 * viewport and passes it to the Engine command, which owns all domain
 * decisions (record structure, era resolution, undo atomicity).
 */
import { fulfillYetCommand } from '/systems/continuum-v2/modules/temporal-engine/commands/fulfill-yet.js';

/**
 * Fulfills a Yet by delegating to the Engine command.
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

    const nowNode = viewport?.latestState?.nowNode;
    if (!nowNode) return;

    await fulfillYetCommand(actor, yetId, nowNode);
}