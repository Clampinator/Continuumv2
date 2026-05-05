import { normalizeDateInput, timestampToDateString } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { formatSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { parseSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { renderDatePickerInput } from './span-graph-ui-helpers.js';
import { activateDatePickers } from './date-picker.js';
import { buildContextOptions } from './lifeline/services/ui/build-context-options.js';
import { resolveEventEra } from '../temporal-kernel/resolve-event-era.js';
import { Sound } from './sound-manager.js';
import { getMaxSortValue } from './sheet-item-handlers.js';

export function openEventEditDialog(data, sheet, viewState, graphData) {
    const actor = sheet.actor;
    const isEraLevel = !data.expId || data.expId === "null";
    const oldPrefix = isEraLevel
        ? `system.eras.${data.eraId}.events.${data.id}`
        : `system.eras.${data.eraId}.experiences.${data.expId}.events.${data.id}`;

    // Resolve era from age if not provided
    let eraId = data.eraId;
    if (!eraId || eraId === 'default') {
        eraId = resolveEventEra(actor.system.eras, data.eventAge || 0);
    }
    const ageForContext = data.eventAge || 0;
    const context = buildContextOptions(actor, eraId, isEraLevel ? null : data.expId, ageForContext);

    const eraNameHtml = `<span style="font-size: 0.95em; color: #4da6ff; font-weight: bold;">${context.eraName}</span>
        <input type="hidden" name="eraId" value="${context.eraId || eraId}" />`;
    const experienceSection = context.experienceOptions
        ? `<div class="form-row"><div class="form-col">
            <label>Experience</label>
            <p class="multi-hint" style="font-size:0.75em;color:#8ecae6;font-style:italic;">Which experience within this era?</p>
            <div class="context-list-scroll" style="max-height:220px;overflow-y:auto;background:#111;border:1px solid #444;padding:5px;border-radius:4px;">
                ${context.experienceOptions}
            </div></div></div>`
        : '';
    const lifecycleSection = context.lifecycleHtml
        ? `<div class="form-row"><div class="form-col">
            <div class="context-list-scroll" style="max-height:220px;overflow-y:auto;background:#111;border:1px solid #444;padding:5px;border-radius:4px;">
                ${context.lifecycleHtml}
            </div></div></div>`
        : '';

    const content = `
        <form class="continuum-dialog-form" autocomplete="off">
            <style>
                .continuum-dialog-form { display: flex; flex-direction: column; gap: 10px; }
                .form-row { display: flex; gap: 10px; width: 100%; align-items: flex-end; }
                .form-col { flex: 1; display: flex; flex-direction: column; gap: 4px; }
                .form-col label { font-size: 0.8em; font-weight: bold; color: #ccc; }
                .context-select { min-height: 32px; width: 100%; }
                .context-item { display: flex; align-items: center; gap: 10px; padding: 4px 6px; border-radius: 3px; transition: background 0.15s; }
                .context-item:hover { background: rgba(255, 255, 255, 0.05); }
                .context-item input[type="radio"], .context-item input[type="checkbox"] { margin: 0; width: 16px; height: 16px; flex-shrink: 0; }
                .context-item label { cursor: pointer; flex: 1; font-size: 0.9em; color: #eee; margin: 0; user-select: none; }
            </style>

            <div class="form-row">
                <div class="form-col">
                    <label>Subjective Age</label>
                    <input type="text" name="eventAge" value="${formatSubjectiveAge(data.eventAge)}">
                </div>
            </div>

            <div class="form-row">
                <div class="form-col">
                    <label>Date</label>
                    ${renderDatePickerInput("eventDate", data.eventIsSpan ? data.eventSpanFromDate : data.eventDate)}
                </div>
                <div class="form-col">
                    <label>Time</label>
                    <input type="time" step="1" name="eventTime" value="${data.eventIsSpan ? data.eventSpanFromTime : data.eventTime}"/>
                </div>
            </div>

            <div class="form-row">
                <div class="form-col">
                    <label>Era</label>
                    ${eraNameHtml}
                </div>
            </div>

            ${experienceSection}
            ${lifecycleSection}

            <div class="form-row">
                <div class="form-col">
                    <label>eventTitle</label>
                    <input type="text" name="eventTitle" value="${data.eventTitle || ''}" autofocus />
                </div>
            </div>

            <div class="form-row">
                <div class="form-col">
                    <label>eventNotes</label>
                    <textarea name="eventNotes" style="min-height: 80px;">${data.eventNotes || ''}</textarea>
                </div>
            </div>

            <div class="form-row" style="align-items: center; gap: 8px;">
                <input type="checkbox" name="eventIsRest" id="editIsRest" ${data.eventIsRest ? 'checked' : ''} ${data.eventIsSpan ? 'disabled' : ''} />
                <label for="editIsRest" style="margin-bottom:0; font-weight: bold; color: #28a745; cursor: pointer;">Rest (24h)</label>
            </div>
        </form>
    `;

    const dialog = new Dialog({
        eventTitle: data.eventIsSpan ? "Edit Span" : "Edit Event",
        content: content,
        render: (html) => activateDatePickers(html),
        buttons: {
            save: {
                label: "Save Changes",
                icon: '<i class="fas fa-save"></i>',
                callback: async (html) => {
                    const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    const actionVal = formData.experienceAction;
                    const updates = {};
                    
                    let targetEraId = data.eraId;
                    let targetExpId = data.expId;
                    const eventDate = normalizeDateInput(formData.eventDate);

                    if (actionVal !== 'new') {
                        const [type, aId, eId] = actionVal.split(':');
                        targetEraId = aId;
                        targetExpId = (eId === "null" || !eId) ? null : eId;

                        if (type === 're-open' && targetExpId) {
                            updates[`system.eras.${targetEraId}.experiences.${targetExpId}.dateTo`] = "";
                            updates[`system.eras.${targetEraId}.sort`] = getMaxSortValue(actor.system.eras) + 1000;
                            updates[`system.eras.${targetEraId}.experiences.${targetExpId}.sort`] = getMaxSortValue(actor.system.eras[targetEraId]?.experiences) + 1000;
                        }
                    }

                    const updatedEvent = {
                        ...data,
                        eventTitle: formData.eventTitle,
                        eventNotes: formData.eventNotes,
                        age: parseSubjectiveAge(formData.eventAge),
                        eventIsRest: !data.eventIsSpan && formData.eventIsRest,
                        eraId: targetEraId,
                        expId: targetExpId
                    };

                    if (data.eventIsSpan) {
                        updatedEvent.eventSpanFromDate = eventDate;
                        updatedEvent.eventSpanFromTime = formData.eventTime;
                    } else {
                        updatedEvent.date = eventDate;
                        updatedEvent.time = formData.eventTime;
                    }

                    if (targetEraId !== data.eraId || targetExpId !== data.expId) {
                        // REMOVE OLD
                        updates[oldPrefix.replace(/\.events\./, '.-=events.')] = null;
                        updates[`${oldPrefix.substring(0, oldPrefix.lastIndexOf('.'))}.-=${data.id}`] = null;

                        // ADD NEW
                        const newPath = targetExpId
                            ? `system.eras.${targetEraId}.experiences.${targetExpId}.events.${data.id}`
                            : `system.eras.${targetEraId}.events.${data.id}`;

                        updatedEvent.sort = targetExpId
                            ? getMaxSortValue(actor.system.eras[targetEraId]?.experiences[targetExpId]?.events) + 1000
                            : getMaxSortValue(actor.system.eras[targetEraId]?.events) + 1000;

                        updates[newPath] = updatedEvent;
                    } else {
                        updates[oldPrefix] = updatedEvent;
                    }

                    await actor.update(updates);
                    Sound.confirm();
                }
            },
            delete: {
                label: "Delete",
                icon: '<i class="fas fa-trash"></i>',
                callback: async () => {
                    await actor.update({ [`${oldPrefix.substring(0, oldPrefix.lastIndexOf('.'))}.-=${data.id}`]: null });
                    Sound.delete();
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "save",
        close: () => { viewState.interactionMode = 'pan'; }
    }, { classes: ["continuum-v2", "dialog"], width: 450 }).render(true);
}
