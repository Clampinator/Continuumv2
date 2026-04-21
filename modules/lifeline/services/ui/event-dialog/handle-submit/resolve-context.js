export function resolveContext(actor, formData, params) {
    const { existingData, eraId, expId } = params;
    const contextAction = formData.experienceAction;

    // AUTHORITY: Prioritize explicit context from params (hover data) over existing data
    let targetEraId = eraId || existingData?.eraId || Object.keys(actor.system.eras || {})[0];
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
