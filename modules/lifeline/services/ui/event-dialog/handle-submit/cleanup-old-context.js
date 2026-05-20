export function cleanupOldContext(existingData, context, updates) {
    const { targetEraId, targetExpId } = context;
    const oldEraId = existingData.eraId;
    const oldExpId = existingData.expId;

    if (oldEraId !== targetEraId || oldExpId !== targetExpId) {
        const oldRoot = oldExpId ? `system.eras.${oldEraId}.experiences.${oldExpId}` : `system.eras.${oldEraId}`;
        const oldPath = `${oldRoot}.events.${existingData.id}`;
        
        for (const key of Object.keys(updates)) {
            if (key.startsWith(oldPath)) delete updates[key];
        }

        updates[`${oldRoot}.events.-=${existingData.id}`] = null;
    }
}
