import { resolveEventEra } from '../../../../../temporal-kernel/resolve-event-era.js';

export function resolveContext(actor, formData, params) {
    const { existingData, eraId, expId } = params;
    const contextAction = formData.experienceAction;

    // Prioritize explicit era from params, then resolve from age
    let targetEraId = eraId || existingData?.eraId;
    if (!targetEraId || targetEraId === 'default') {
        const age = existingData?.eventAge || existingData?.x || params.ageRaw || 0;
        targetEraId = resolveEventEra(actor.system.eras, age);
    }
    let targetExpId = expId || existingData?.expId || null;

    if (contextAction) {
        const parts = String(contextAction).split(':');
        if (parts[0] === 'move') {
            targetEraId = parts[1];
            targetExpId = (parts[2] === "null" || !parts[2]) ? null : parts[2];
        }
    }

    return { targetEraId, targetExpId };
}
