export function handleHandover(actor, formData, context, updates) {
    let { targetEraId, targetExpId, anchorFull } = context;

    // HANDLE GENESIS: Start a new experience container
    if (formData.startNewExp) {
        const newExpId = foundry.utils.randomID();
        const expName = formData.newExpName || "New Experience";
        const era = actor.system.eras[targetEraId];
        const exps = era?.experiences || {};
        let maxSort = 0;
        for (const e of Object.values(exps)) {
            const s = Number(e.sort) || 0;
            if (s > maxSort) maxSort = s;
        }

        updates[`system.eras.${targetEraId}.experiences.${newExpId}`] = {
            id: newExpId,
            name: expName,
            dateFrom: anchorFull,
            dateTo: "",
            isOngoing: true,
            color: "#2a2a2a",
            sort: maxSort + 1000
        };
        
        targetExpId = newExpId;
    }

    // HANDLE LIFECYCLE: Close existing loops
    if (formData.closeExperiences) {
        const targets = Array.isArray(formData.closeExperiences) ? formData.closeExperiences : [formData.closeExperiences];
        targets.forEach(t => {
            if (!t || typeof t !== 'string') return;
            const parts = t.split(':');
            if (parts.length < 2) return;
            const [aId, eId] = parts;
            updates[`system.eras.${aId}.experiences.${eId}.dateTo`] = anchorFull;
            updates[`system.eras.${aId}.experiences.${eId}.isOngoing`] = false;
        });
    }

    // HANDLE LIFECYCLE: Re-open closed loops
    if (formData.reopenExperiences) {
        const targets = Array.isArray(formData.reopenExperiences) ? formData.reopenExperiences : [formData.reopenExperiences];
        targets.forEach(t => {
            if (!t || typeof t !== 'string') return;
            const parts = t.split(':');
            if (parts.length < 2) return;
            const [aId, eId] = parts;
            updates[`system.eras.${aId}.experiences.${eId}.dateTo`] = "";
            updates[`system.eras.${aId}.experiences.${eId}.isOngoing`] = true;
        });
    }

    return targetExpId;
}
