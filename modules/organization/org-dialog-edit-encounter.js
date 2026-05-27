/*
org-dialog-edit-encounter.js

"Edit Encounter" dialog for the Operational Map.
Mirrors span-graph-dialog-event.js + build-context-options.js from the
character-sheet Lifeline, translated into org nomenclature:
  Eras        -> Phase Periods
  Experiences -> Operations
  Events      -> Encounters
*/

// CONTEXT PANEL

function isDateInOperation(dateStr, exp) {
    if (!dateStr || !exp.dateFrom) return false;
    const d    = new Date(dateStr + 'T00:00:00').getTime();
    const from = new Date(exp.dateFrom + 'T00:00:00').getTime();
    if (isNaN(d) || isNaN(from)) return false;
    if (!exp.dateTo || exp.dateTo.trim() === '') return d >= from;
    const to = new Date(exp.dateTo + 'T00:00:00').getTime();
    return d >= from && d <= to;
}

function buildOrgContextOptions(actor, engDate) {
    const allEras  = actor.system.eras || {};
    const openOps  = [];
    const closedOps = [];

    // Audit operation status
    Object.entries(allEras).forEach(([aId, era]) => {
        Object.entries(era.experiences || {}).forEach(([eId, exp]) => {
            if (!exp.name) return;
            const data = { id: eId, eraId: aId, eraName: era.name || 'Untitled', name: exp.name };
            if (!exp.dateTo || exp.dateTo.trim() === '') openOps.push(data);
            else closedOps.push(data);
        });
    });

    let html = '';

    // ── SECTION A: PRIMARY LOCATION ──────────────────────────────────────────
    html += `<div class="context-item optgroup-header">Primary Location</div>`;

    const sortedEras = Object.entries(allEras)
        .map(([id, era]) => ({ ...era, id }))
        .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

    if (sortedEras.length === 0) {
        html += `<div class="context-item" style="color:#888; font-style:italic; padding-left:8px;">
            No Phase Periods defined — create one in the graph first.
        </div>`;
    }

    sortedEras.forEach(era => {
        const eraVal = `phase:${era.id}:null`;
        const eraInputId = `ctx-era-${era.id}`;
        html += `<div class="context-item">
            <input type="radio" name="operationAction" value="${eraVal}" id="${eraInputId}">
            <label for="${eraInputId}">Phase: ${era.name || 'Untitled'}</label>
        </div>`;

        const eraExps = Object.entries(era.experiences || {})
            .map(([id, exp]) => ({ ...exp, id }))
            .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

        eraExps.forEach(exp => {
            const mVal = `op:${era.id}:${exp.id}`;
            const mId  = `ctx-op-${exp.id}`;
            const status      = (!exp.dateTo || exp.dateTo.trim() === '') ? '' : ' [Closed]';
            const isContaining = isDateInOperation(engDate, exp);
            html += `<div class="context-item sub-item">
                <input type="radio" name="operationAction" value="${mVal}" id="${mId}" ${isContaining ? 'checked' : ''}>
                <label for="${mId}">Op: ${exp.name}${status}</label>
            </div>`;
        });
    });

    // ── SECTION B: END OPEN OPERATIONS ───────────────────────────────────────
    if (openOps.length > 0) {
        html += `<div class="context-item optgroup-header">End Open Operations</div>`;
        openOps.forEach(e => {
            const val = `${e.eraId}:${e.id}`;
            const id  = `co-${e.id}`;
            html += `<div class="context-item">
                <input type="checkbox" name="closeOperations" value="${val}" id="${id}">
                <label for="${id}">Close "${e.name}" at this Date</label>
            </div>`;
        });
    }

    // ── SECTION C: RE-OPEN CLOSED OPERATIONS ─────────────────────────────────
    if (closedOps.length > 0) {
        html += `<div class="context-item optgroup-header">Re-open Closed Operations</div>`;
        closedOps.forEach(e => {
            const val = `${e.eraId}:${e.id}`;
            const id  = `ro-${e.id}`;
            html += `<div class="context-item">
                <input type="checkbox" name="reopenOperations" value="${val}" id="${id}">
                <label for="${id}">Re-open "${e.name}"</label>
            </div>`;
        });
    }

    // ── SECTION D: ACTION ITEMS ───────────────────────────────────────────────
    html += `<div class="context-item optgroup-header">Action Items</div>`;
    html += `<div class="context-item">
        <input type="checkbox" name="startNewOperation" value="true" id="ctx-new-op">
        <label for="ctx-new-op" style="color: #28a745; font-weight: bold;">+ Start a New Operation here</label>
    </div>`;

    return html;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function openOrgEncounterEditDialog(sheet, engNode, graphData) {
    const actor = sheet.actor;
    const eng   = actor.system.phases?.[engNode.phaseId]
        ?.operations?.[engNode.opId]?.engagements?.[engNode.engId];
    if (!eng) {
        console.warn('Continuum | openOrgEncounterEditDialog: engagement not found', engNode);
        return;
    }

    const engDate = eng.date || '';
    const engTime = eng.time || '00:00';
    const contextHtml = buildOrgContextOptions(actor, engDate);

    const content = `
        <form class="continuum-dialog-form" autocomplete="off">
            <style>
                .continuum-dialog-form { display: flex; flex-direction: column; gap: 10px; }
                .form-row { display: flex; gap: 10px; width: 100%; align-items: flex-end; }
                .form-col { flex: 1; display: flex; flex-direction: column; gap: 4px; }
                .form-col label { font-size: 0.8em; font-weight: bold; color: #ccc; }
                .org-context-panel {
                    max-height: 180px;
                    overflow-y: auto;
                    border: 1px solid #444;
                    border-radius: 4px;
                    padding: 4px;
                    background: rgba(0,0,0,0.2);
                }
                .context-item { display: flex; align-items: center; gap: 6px; padding: 2px 4px; }
                .context-item.sub-item { padding-left: 20px; }
                .context-item.optgroup-header {
                    font-size: 0.75em; font-weight: bold; color: #888;
                    text-transform: uppercase; letter-spacing: 0.05em;
                    padding: 4px 4px 2px 4px; border-top: 1px solid #333;
                    margin-top: 2px; display: block;
                }
                .context-item.optgroup-header:first-child { border-top: none; margin-top: 0; }
                .context-item label { margin: 0; cursor: pointer; font-size: 0.9em; flex: 1; }
                .context-item input[type=radio],
                .context-item input[type=checkbox] { flex-shrink: 0; }
            </style>

            <div class="form-row">
                <div class="form-col">
                    <label>Name</label>
                    <input type="text" name="name" value="${eng.name || ''}" autofocus />
                </div>
            </div>

            <div class="form-row">
                <div class="form-col">
                    <label>Date</label>
                    <input type="date" name="engDate" value="${engDate}" />
                </div>
                <div class="form-col">
                    <label>Time</label>
                    <input type="time" step="1" name="engTime" value="${engTime}" />
                </div>
            </div>

            <div class="form-row">
                <div class="form-col">
                    <label>Location</label>
                    <input type="text" name="eventSpanFromLocation" value="${eng.eventSpanFromLocation || ''}" placeholder="Address or place name" />
                </div>
            </div>

            <div class="form-row">
                <div class="form-col">
                    <label>Context (Operation)</label>
                    <div class="org-context-panel">
                        ${contextHtml}
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-col">
                    <label>eventNotes</label>
                    <textarea name="description" style="min-height: 80px;">${eng.description || ''}</textarea>
                </div>
            </div>
        </form>
    `;

    new Dialog({
        eventTitle: 'Edit Encounter',
        content,
        buttons: {
            save: {
                label: 'Save Changes',
                icon: '<i class="fas fa-save"></i>',
                callback: async (html) => {
                    const fd = new foundry.applications.ux.FormDataExtended(html.find('form')[0]).object;
                    const updates = {};
                    const basePath = `system.phases.${engNode.phaseId}.operations.${engNode.opId}.engagements.${engNode.engId}`;

                    // ── Update engagement fields ──────────────────────────────
                    updates[`${basePath}.name`]             = fd.name || '';
                    updates[`${basePath}.date`]             = fd.engDate || '';
                    updates[`${basePath}.time`]             = fd.engTime || '';
                    updates[`${basePath}.eventSpanFromLocation`] = fd.eventSpanFromLocation || '';
                    updates[`${basePath}.description`]      = fd.description || '';

                    // ── End open operations at this encounter's date ──────────
                    const toClose = [fd.closeOperations].flat().filter(Boolean);
                    for (const val of toClose) {
                        const [aId, eId] = val.split(':');
                        if (aId && eId) {
                            updates[`system.eras.${aId}.experiences.${eId}.dateTo`]      = fd.engDate || '';
                            updates[`system.eras.${aId}.experiences.${eId}.isOngoing`]   = false;
                        }
                    }

                    // ── Re-open closed operations ─────────────────────────────
                    const toReopen = [fd.reopenOperations].flat().filter(Boolean);
                    for (const val of toReopen) {
                        const [aId, eId] = val.split(':');
                        if (aId && eId) {
                            updates[`system.eras.${aId}.experiences.${eId}.dateTo`]      = '';
                            updates[`system.eras.${aId}.experiences.${eId}.isOngoing`]   = true;
                        }
                    }

                    // ── Start a new operation at this encounter's date ────────
                    if (fd.startNewOperation) {
                        const inceptionTs  = graphData.dobTimestamp;
                        const engMs        = new Date((fd.engDate || '') + 'T00:00:00').getTime();
                        const startAgeSecs = Number.isFinite(engMs) ? (engMs - inceptionTs) / 1000 : 0;
                        const matchingPhase = graphData.eras.find(a =>
                            startAgeSecs >= a.startAgeSeconds && startAgeSecs <= a.endAgeSeconds
                        );
                        if (matchingPhase) {
                            const newId   = foundry.utils.randomID();
                            const existing = Object.values(actor.system.eras?.[matchingPhase.id]?.experiences || {});
                            const maxSort  = existing.length ? Math.max(...existing.map(e => Number(e.sort) || 0)) : 0;
                            updates[`system.eras.${matchingPhase.id}.experiences.${newId}`] = {
                                id: newId, name: 'New Operation',
                                dateFrom: fd.engDate || '', dateTo: '',
                                isOngoing: true, description: '', linkedAspects: [], events: {}, sort: maxSort + 1000,
                            };
                        } else {
                            ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.NoPhasePeriodForDate"));
                        }
                    }

                    await actor.update(updates);
                }
            },
            delete: {
                label: 'Delete',
                icon: '<i class="fas fa-trash"></i>',
                callback: async () => {
                    await actor.update({
                        [`system.phases.${engNode.phaseId}.operations.${engNode.opId}.engagements.-=${engNode.engId}`]: null
                    });
                }
            },
            cancel: { label: 'Cancel' }
        },
        default: 'save',
    }, { classes: ['continuum-v2', 'dialog'], width: 480 }).render(true);
}
