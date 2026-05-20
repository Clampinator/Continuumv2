/**
 * Handles the opening, closing, and movement of experiences.
 * Returns an array of { eraId, expId } objects that were closed, so the caller
 * can stamp endsExpId on the closing event and clear the event's expId.
 */
export function processExperienceLifecycle(actor, formData, updates, anchorFull) {
    const closedExpIds = [];

    // 1. Handle Closures
    let closeExps = formData.closeExperiences || [];
    if (typeof closeExps === 'string') closeExps = [closeExps];
    closeExps = closeExps.filter(v => typeof v === 'string' && v.includes(':'));

    closeExps.forEach(val => {
        const [eraId, expId] = val.split(':');
        updates[`system.eras.${eraId}.experiences.${expId}.dateTo`] = anchorFull;
        updates[`system.eras.${eraId}.experiences.${expId}.isOngoing`] = false;
        // Return full identifiers so the caller can stamp endsExpId
        closedExpIds.push({ eraId, expId });
    });

    // 2. Handle Re-opening
    let reopenExps = formData.reopenExperiences || [];
    if (typeof reopenExps === 'string') reopenExps = [reopenExps];
    reopenExps = reopenExps.filter(v => typeof v === 'string' && v.includes(':'));

    reopenExps.forEach(val => {
        const [eraId, expId] = val.split(':');
        updates[`system.eras.${eraId}.experiences.${expId}.dateTo`] = "";
        updates[`system.eras.${eraId}.experiences.${expId}.isOngoing`] = true;
    });

    return closedExpIds;
}

/**
 * Handles starting a brand new experience.
 */
export function handleNewExperience(actor, formData, updates, targetEraId, anchorFull) {
    if (!formData.startNewExp) return null;

    const newExpId = foundry.utils.randomID();
    const expName = formData.newExpName || "New Experience";
    const era = actor.system.eras[targetEraId];
    const exps = era?.experiences || {};
    
    let maxSort = 0;
    Object.values(exps).forEach(e => {
        const s = Number(e.sort) || 0;
        if (s > maxSort) maxSort = s;
    });

    updates[`system.eras.${targetEraId}.experiences.${newExpId}`] = {
        id: newExpId,
        name: expName,
        dateFrom: anchorFull,
        dateTo: "",
        isOngoing: true,
        color: "#2a2a2a",
        sort: maxSort + 1000
    };

    return newExpId;
}
