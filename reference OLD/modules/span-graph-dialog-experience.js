// continuum/modules/span-graph-dialog-experience.js
import { renderDatePicker } from './span-graph-ui-helpers.js';
import { activateDatePickers } from './date-picker.js';
import { normalizeDateInput, getAgeStringFromDate, parseAgeString } from './span-graph-utils/provide-span-graph-utils.js';
import { Sound } from './sound-manager.js';

export function openExperienceEditDialog(data, sheet, viewState) {
    const dobStr = sheet.actor.system.personal.dob;
    const dobTs = dobStr ? new Date(dobStr + "T00:00:00").getTime() : Date.now();
    const startAgeStr = getAgeStringFromDate(data.dateFrom, dobTs);
    const endAgeStr = getAgeStringFromDate(data.dateTo, dobTs);

    const content = `
        <form autocomplete="off">
            <style>
                .ongoing-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding: 5px; background: rgba(74, 144, 226, 0.1); border-radius: 4px; border: 1px dashed rgba(74, 144, 226, 0.3); }
                .ongoing-row input { width: 20px; height: 20px; cursor: pointer; }
                .ongoing-row label { color: #4a90e2; font-weight: bold; cursor: pointer; flex: 1; }
            </style>
            <div class="form-group"><label>Name</label><input type="text" name="name" value="${data.name}" autofocus/></div>
            
            <div class="ongoing-row">
                <input type="checkbox" name="isOngoing" id="edit-exp-ongoing" ${data.isOngoing ? 'checked' : ''} />
                <label for="edit-exp-ongoing">Ongoing (Active Maintenance)</label>
            </div>

            <div class="form-group" style="display: flex; flex-direction: column; align-items: flex-start; gap: 3px; margin-bottom: 5px;">
                <label>Description</label>
                <textarea name="description" style="width: 100%; min-height: 100px; resize: vertical;">${data.description}</textarea>
            </div>
            
            <div class="form-group" style="margin-top: 10px; border-top: 1px solid #444; padding-top: 5px;">
                <label style="color: #aaa; font-size: 0.8em;">Timeline Reference</label>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                    ${renderDatePicker("dateFrom", data.dateFrom, "Start Date")}
                </div>
                <div style="flex: 1;">
                    <div class="form-group">
                        <label>Start Age</label>
                        <input type="text" name="startAge" value="${startAgeStr}" placeholder="e.g. 17y 2m"/>
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                    ${renderDatePicker("dateTo", data.dateTo, "End Date")}
                </div>
                <div style="flex: 1;">
                    <div class="form-group">
                        <label>End Age</label>
                        <input type="text" name="endAge" value="${endAgeStr}" placeholder="e.g. 23y"/>
                    </div>
                </div>
            </div>
        </form>
    `;

    new Dialog({
        title: "Edit Experience",
        content: content,
        render: (html) => {
            activateDatePickers(html);
            html.find("input[type='text']").on("focus", event => event.currentTarget.select());

            const ongoingCheck = html.find('input[name="isOngoing"]');
            const dateToInput = html.find('input[name="dateTo"]');

            // Logic: If user picks an end date, turn off ongoing
            dateToInput.on('change', (e) => {
                if (e.target.value.trim() !== "") {
                    ongoingCheck.prop('checked', false);
                }
            });

            // Logic: If user checks ongoing, clear end date
            ongoingCheck.on('change', (e) => {
                if (e.target.checked) {
                    dateToInput.val('').trigger('change');
                }
            });
        },
        buttons: {
            save: {
                label: "Save",
                icon: '<i class="fas fa-save"></i>',
                callback: async (html) => {
                    const formData = new FormDataExtended(html.find("form")[0]).object;
                    const updates = {};
                    const prefix = `system.eras.${data.eraId}.experiences.${data.id}`;
                    
                    updates[`${prefix}.name`] = formData.name;
                    updates[`${prefix}.description`] = formData.description;
                    updates[`${prefix}.isOngoing`] = !!formData.isOngoing;
                    
                    // Sync Subjective Age strings to Dates if they were edited
                    if (formData.startAge && formData.startAge !== startAgeStr) {
                        const startSec = parseAgeString(formData.startAge);
                        const startDate = new Date(dobTs + (startSec * 1000));
                        updates[`${prefix}.dateFrom`] = startDate.toISOString().split('T')[0];
                    } else {
                        updates[`${prefix}.dateFrom`] = normalizeDateInput(formData.dateFrom);
                    }

                    if (formData.endAge && formData.endAge !== endAgeStr) {
                        const endSec = parseAgeString(formData.endAge);
                        const endDate = new Date(dobTs + (endSec * 1000));
                        updates[`${prefix}.dateTo`] = endDate.toISOString().split('T')[0];
                    } else {
                        updates[`${prefix}.dateTo`] = normalizeDateInput(formData.dateTo);
                    }
                    
                    await sheet.actor.update(updates);
                    Sound.confirm();
                }
            },
            delete: {
                label: "Delete",
                icon: '<i class="fas fa-trash"></i>',
                callback: async () => {
                    await sheet.actor.update({ [`system.eras.${data.eraId}.experiences.-=${data.id}`]: null });
                    Sound.delete();
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "save",
        close: () => { viewState.interactionMode = 'pan'; }
    }, { classes: ["continuum", "dialog"], width: 450 }).render(true);
}