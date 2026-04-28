/**
 * Generates the HTML for the Context action list used in the Span Result editor.
 * Includes Primary Location (Parentage) and Lifecycle Controls.
 */
export function buildContextOptions(actor, currentEraId = null, currentExpId = null) {
    const allEras = actor.system.eras || {};
    const openExps = [];
    const closedExps = [];

    // 1. Audit current experience status
    Object.entries(allEras).forEach(([aId, era]) => {
        Object.entries(era.experiences || {}).forEach(([eId, exp]) => {
            if (!exp.name) return;
            const data = { id: eId, eraId: aId, name: exp.name };
            if (!exp.dateTo || exp.dateTo.trim() === "") openExps.push(data);
            else closedExps.push(data);
        });
    });

    let html = '';

    // SECTION A: PRIMARY LOCATION (Radios)
    html += `<div class="context-item optgroup-header">Primary Location</div>`;

    const sortedEras = Object.entries(allEras)
        .map(([id, era]) => ({ ...era, id }))
        .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

    sortedEras.forEach(era => {
        const isCurrentlyAtEraLevel = currentEraId === era.id && (!currentExpId || currentExpId === "null");
        const eraOnlyValue = `move:${era.id}:null`;
        const eraOnlyId = `ctx-${era.id}-null`;

        html += `<div class="context-item">
            <input type="radio" name="experienceAction" value="${eraOnlyValue}" id="${eraOnlyId}" ${isCurrentlyAtEraLevel ? 'checked' : ''}>
            <label for="${eraOnlyId}">Era: ${era.name || 'Untitled'}</label>
        </div>`;

        const eraExps = Object.entries(era.experiences || {})
            .map(([id, exp]) => ({ ...exp, id }))
            .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

        eraExps.forEach(exp => {
            const isCurrent = currentEraId === era.id && currentExpId === exp.id;
            const mValue = `move:${era.id}:${exp.id}`;
            const mId = `ctx-m-${exp.id}`;
            const status = (!exp.dateTo || exp.dateTo.trim() === "") ? "" : " [Closed]";
            html += `<div class="context-item sub-item">
                <input type="radio" name="experienceAction" value="${mValue}" id="${mId}" ${isCurrent ? 'checked' : ''}>
                <label for="${mId}">Exp: ${exp.name}${status}</label>
            </div>`;
        });
    });

    // SECTION B: END OPEN LOOPS (Checkboxes)
    if (openExps.length > 0) {
        html += `<div class="context-item optgroup-header">End Open Experiences</div>`;
        openExps.forEach(e => {
            const val = `${e.eraId}:${e.id}`;
            const id = `ce-${e.id}`;
            const isCurrent = currentExpId === e.id;

            html += `<div class="context-item">
                <input type="checkbox" name="closeExperiences" value="${val}" id="${id}" ${isCurrent ? 'data-is-current="true"' : ''}>
                <label for="${id}" ${isCurrent ? 'style="color: #4da6ff; font-weight: bold;"' : ''}>
                    Close "${e.name}" at this Date ${isCurrent ? '<i class="fas fa-map-pin" eventTitle="Node currently resides here"></i>' : ''}
                </label>
            </div>`;
        });
    }

    // SECTION C: RE-OPEN CLOSED LOOPS (Checkboxes)
    if (closedExps.length > 0) {
        html += `<div class="context-item optgroup-header">Re-open Closed Experiences</div>`;
        closedExps.forEach(e => {
            const val = `${e.eraId}:${e.id}`;
            const id = `re-${e.id}`;
            html += `<div class="context-item">
                <input type="checkbox" name="reopenExperiences" value="${val}" id="${id}">
                <label for="${id}">Re-open "${e.name}"</label>
            </div>`;
        });
    }

    // SECTION D: ACTION ITEMS
    html += `<div class="context-item optgroup-header">Action Items</div>`;
    html += `<div class="context-item">
        <input type="checkbox" name="startNewExp" value="true" id="ctx-new">
        <label for="ctx-new" style="color: #28a745; font-weight: bold;">+ Start a New Experience here</label>
    </div>`;

    return html;
}
