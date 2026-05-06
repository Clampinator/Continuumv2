import { createEndOfRestEvent } from '../../handle-rest-toggle.js';

/**
 * Handles the 24h Rest cycle automation.
 * createEndOfRestEvent handles both DB-sourced events (with ts) and
 * form-sourced events (with eventDate/eventTime only).
 *
 * @param {Actor} actor
 * @param {object} eventData - The form data that was committed
 * @param {object} existingData - The pre-commit event data (for toggle detection).
 *   May be a manifest node (with eventIsRest inside .record) or a raw
 *   Foundry event object (with eventIsRest at top level).
 * @param {object} context - { targetAgeId, targetExpId }
 */
export async function handleRestLogic(actor, eventData, existingData, context) {
    const { targetAgeId, targetExpId } = context;

    // Detect toggle: rest was OFF before, now it's ON.
    // existingData may be a manifest node (record.eventIsRest) or a raw
    // Foundry event object (eventIsRest).
    const wasAlreadyRest = Boolean(
        existingData?.record?.eventIsRest || existingData?.eventIsRest
    );
    const isRestToggledOn = !wasAlreadyRest && eventData.eventIsRest;

    if (isRestToggledOn) {
        await createEndOfRestEvent(actor, eventData, targetAgeId, targetExpId);
    }
}
