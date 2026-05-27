/*
build-context-options.js
Generates the HTML for the Context section of the Event Node editor.
Since events belong to exactly one Era (or none), we only show:
- A read-only era name label
- Experiences within that era (radio selection)
- Lifecycle controls scoped to that era
*/

import { computeEraBoundaries } from '/systems/continuum-v2/modules/temporal-kernel/compute-era-boundaries.js';

export function buildContextOptions(actor, currentEraId = null, currentExpId = null, targetAge = 0) {
    const allEras = actor.system.eras || {};

    // Re-resolve stale era IDs ('default' from before eras existed)
    let eraId = currentEraId;
    if (!eraId || eraId === 'default' || !allEras[eraId]) {
        if (targetAge !== undefined && targetAge !== null) {
            const boundaries = computeEraBoundaries(allEras);
            if (boundaries.length > 0) {
                for (const era of boundaries) {
                    if (targetAge <= era.endAge) {
                        eraId = era.id;
                        break;
                    }
                }
                if (!eraId || !allEras[eraId]) {
                    eraId = boundaries[boundaries.length - 1].id;
                }
            }
        }
    }

    // If the event has no era, show minimal context
    if (!eraId || !allEras[eraId]) {
        return { eraName: game.i18n.localize("CONTINUUM.ContextDialog.NoEra"), eraId: null, experienceOptions: '', lifecycleHtml: '', defaultNewExpName: game.i18n.localize("CONTINUUM.ContextDialog.NewExperience") };
    }

    const era = allEras[eraId];
    const eraName = era.name || era.label || eraId;

    // EXPERIENCE RADIOS: Only experiences within this era
    const eraExps = Object.entries(era.experiences || {})
        .map(([id, exp]) => ({ ...exp, id }))
        .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

    let experienceOptions = '';
    const isCurrentlyAtEraLevel = !currentExpId || currentExpId === "null";
    const eraOnlyValue = `move:${eraId}:null`;
    const eraOnlyId = `ctx-${eraId}-null`;

    experienceOptions += `<div class="context-item">
        <input type="radio" name="experienceAction" value="${eraOnlyValue}" id="${eraOnlyId}" ${isCurrentlyAtEraLevel ? 'checked' : ''}>
        <label for="${eraOnlyId}">${game.i18n.localize("CONTINUUM.ContextDialog.EraLevelNoExp")}</label>
    </div>`;

    eraExps.forEach(exp => {
        const isCurrent = currentExpId === exp.id;
        const mValue = `move:${eraId}:${exp.id}`;
        const mId = `ctx-m-${exp.id}`;
        const status = (exp.isOngoing || !exp.dateTo || exp.dateTo.trim() === "") ? "" : ` ${game.i18n.localize("CONTINUUM.ContextDialog.ClosedLabel")}`;
        experienceOptions += `<div class="context-item sub-item">
            <input type="radio" name="experienceAction" value="${mValue}" id="${mId}" ${isCurrent ? 'checked' : ''}>
            <label for="${mId}">Exp: ${exp.name}${status}</label>
        </div>`;
    });

    // LIFECYCLE CONTROLS: Close/reopen experiences, start new
    let lifecycleHtml = '';

    const openExps = eraExps.filter(exp => !exp.dateTo || exp.dateTo.trim() === "" || exp.isOngoing);
    const closedExps = eraExps.filter(exp => exp.dateTo && exp.dateTo.trim() !== "" && !exp.isOngoing);

    if (openExps.length > 0) {
        lifecycleHtml += `<div class="context-item optgroup-header">${game.i18n.localize("CONTINUUM.ContextDialog.EndOpenExperiences")}</div>`;
        openExps.forEach(e => {
            const val = `${eraId}:${e.id}`;
            const id = `ce-${e.id}`;
            const isCurrent = currentExpId === e.id;
            lifecycleHtml += `<div class="context-item">
                <input type="checkbox" name="closeExperiences" value="${val}" id="${id}" ${isCurrent ? 'data-is-current="true"' : ''}>
                <label for="${id}" ${isCurrent ? 'style="color: #4da6ff; font-weight: bold;"' : ''}>
                    ${game.i18n.format("CONTINUUM.ContextDialog.CloseAtDate", {name: e.name})} ${isCurrent ? `<i class="fas fa-map-pin" eventTitle="${game.i18n.localize('CONTINUUM.ContextDialog.CurrentlyHere')}"></i>` : ''}
                </label>
            </div>`;
        });
    }

    if (closedExps.length > 0) {
        lifecycleHtml += `<div class="context-item optgroup-header">${game.i18n.localize("CONTINUUM.ContextDialog.ReopenClosedExperiences")}</div>`;
        closedExps.forEach(e => {
            const val = `${eraId}:${e.id}`;
            const id = `re-${e.id}`;
            lifecycleHtml += `<div class="context-item">
                <input type="checkbox" name="reopenExperiences" value="${val}" id="${id}">
                <label for="${id}">${game.i18n.format("CONTINUUM.ContextDialog.ReopenLabel", {name: e.name})}</label>
            </div>`;
        });
    }

    lifecycleHtml += `<div class="context-item optgroup-header">${game.i18n.localize("CONTINUUM.ContextDialog.ActionItems")}</div>`;
    lifecycleHtml += `<div class="context-item">
        <input type="checkbox" name="startNewExp" value="true" id="ctx-new">
        <label for="ctx-new" style="color: #28a745; font-weight: bold;">${game.i18n.localize("CONTINUUM.ContextDialog.StartNewExperience")}</label>
    </div>`;

    const defaultNewExpName = game.i18n.format("CONTINUUM.ContextDialog.InEraName", {eraName});

    return { eraName, eraId, experienceOptions, lifecycleHtml, defaultNewExpName };
}