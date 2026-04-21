import { normalizeDateInput, convertTimestampToDateString, formatSubjectiveAge, parseAgeString } from './span-graph-utils/provide-span-graph-utils.js';
import { renderDatePickerInput } from './span-graph-ui-helpers.js';
import { activateDatePickers } from './date-picker.js';
import { buildContextOptions } from './lifeline/services/ui/build-context-options.js';
import { Sound } from './sound-manager.js';
import { getMaxSortValue } from './sheet-item-handlers.js';

export function openEventEditDialog(data, sheet, viewState, graphData) {
    const actor = sheet.actor;
    const isEraLevel = !data.expId || data.expId === "null";
    const oldPrefix = isEraLevel
        ? `system.eras.${data.eraId}.events.${data.id}`
        : `system.eras.${data.eraId}.experiences.${data.expId}.events.${data.id}`;

    const optionsHtml = buildContextOptions(actor, data.eraId, isEraLevel ? null : data.expId);

    const content = `
        <form class="continuum-dialog-form" autocomplete="off">
            <style>
                .continuum-dialog-form { display: flex; flex-direction: column; gap: 10px; }
                .form-row { display: flex; gap: 10px; width: 100%; align-items: flex-end; }
                .form-col { flex: 1; display: flex; flex-direction: column; gap: 4px; }
                .form-col label { font-size: 0.8em; font-weight: bold; color: #ccc; }
                .context-select { min-height: 32px; width: 100%; }
            </style>

            <div class="form-row">
                <div class="form-col">
                    <label>Subjective Age</label>
                    <input type="text" name="eventAge" value="${formatSubjectiveAge(data.age)}">
                </div>
            </div>

            <div class="form-row">
                <div class="form-col">
                    <label>Date</label>
                    ${renderDatePickerInput("eventDate", data.isSpan ? data.spanFromDate : data.date)}
                </div>
                <div class="form-col">
                    <label>Time</label>
                    <input type="time" step="1" name="eventTime" value="${data.isSpan ? data.spanFromTime : data.time}"/>
                </div>
            </div>

            <div class="form-row">
                <div class="form-col">
                    <label>Context (Historical Experience)</label>
                    <select name="experienceAction" class="context-select" size="8">
                        ${optionsHtml}
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-col">
                    <label>Title</label>
                    <input type="text" name="title" value="${data.title || ''}" autofocus />
                </div>
            </div>

            <div class="form-row">
                <div class="form-col">
                    <label>Notes</label>
                    <textarea name="notes" style="min-height: 80px;">${data.notes || ''}</textarea>
                </div>
            </div>

            <div class="form-row" style="align-items: center; gap: 8px;">
                <input type="checkbox" name="isRest" id="editIsRest" ${data.isRest ? 'checked' : ''} ${data.isSpan ? 'disabled' : ''} />
                <label for="editIsRest" style="margin-bottom:0; font-weight: bold; color: #28a745; cursor: pointer;">Rest (24h)</label>
            </div>
        </form>
    `;

    const dialog = new Dialog({
        title: data.isSpan ? "Edit Span" : "Edit Event",
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
                        title: formData.title,
                        notes: formData.notes,
                        age: parseAgeString(formData.eventAge),
                        isRest: !data.isSpan && formData.isRest,
                        eraId: targetEraId,
                        expId: targetExpId
                    };

                    if (data.isSpan) {
                        updatedEvent.spanFromDate = eventDate;
                        updatedEvent.spanFromTime = formData.eventTime;
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
