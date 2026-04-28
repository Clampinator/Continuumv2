import { createEndOfRestEvent } from '../../handle-rest-toggle.js';

/**
 * Handles the 24h Rest cycle automation.
 * @param {Actor} actor
 * @param {object} eventData
 * @param {object} existingData
 * @param {object} context - { targetAgeId, targetExpId }
 */
export async function handleRestLogic(actor, eventData, existingData, context) {
    const { targetAgeId, targetExpId } = context;
    const isRestToggledOn = !existingData?.eventIsRest && eventData.eventIsRest;
    
    if (isRestToggledOn) {
        await createEndOfRestEvent(actor, eventData, targetAgeId, targetExpId);
    }
}
