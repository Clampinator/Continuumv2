// continuum/modules/span-graph-dialog-age.js
import { getAgeStringFromDate, parseAgeString } from './span-graph-utils.js';
import { Sound } from './sound-manager.js';

export function openEraEditDialog(data, sheet, viewState) {
    const dobStr = sheet.actor.system.personal.dob;
    const dobTs = dobStr ? new Date(dobStr + "T00:00:00").getTime() : Date.now();
    const startAgeStr = getAgeStringFromDate(data.dateFrom, dobTs);
    const endAgeStr = getAgeStringFromDate(data.dateTo, dobTs);

    const content = `
        <form autocomplete="off">
            <div class="form-group"><label>Era Name</label><input type="text" name="name" value="${data.name}" autofocus/></div>
            <div class="form-group" style="margin-top: 10px; border-top: 1px solid #444; padding-top: 5px;">
                <label style="color: #aaa; font-size: 0.8em;">Subjective Reference</label>
            </div>
            <div class="form-group">
                <label>Start Age</label>
                <input type="text" name="startAge" value="${startAgeStr}" placeholder="e.g. 17y 2m"/>
            </div>
            <div class="form-group">
                <label>End Age</label>
                <input type="text" name="endAge" value="${endAgeStr}" placeholder="e.g. 23y"/>
            </div>
        </form>
    `;

    new Dialog({
        title: "Edit Era",
        content: content,
        render: (html) => {
            html.find("input[type='text']").on("focus", event => event.currentTarget.select());
        },
        buttons: {
            save: {
                label: "Save",
                icon: '<i class="fas fa-save"></i>',
                callback: async (html) => {
                    const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    const updates = {};
                    updates[`system.eras.${data.id}.name`] = formData.name;

                    if (formData.startAge) {
                        const startSec = parseAgeString(formData.startAge);
                        const startDate = new Date(dobTs + (startSec * 1000));
                        updates[`system.eras.${data.id}.dateFrom`] = startDate.toISOString().split('T')[0];
                    }
                    if (formData.endAge) {
                        const endSec = parseAgeString(formData.endAge);
                        const endDate = new Date(dobTs + (endSec * 1000));
                        updates[`system.eras.${data.id}.dateTo`] = endDate.toISOString().split('T')[0];
                    }
                    await sheet.actor.update(updates);
                    Sound.confirm();
                }
            },
            delete: {
                label: "Delete",
                icon: '<i class="fas fa-trash"></i>',
                callback: async () => {
                    await sheet.actor.update({ [`system.eras.-=${data.id}`]: null });
                    Sound.delete();
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "save",
        close: () => { viewState.interactionMode = 'pan'; }
    }, { classes: ["continuum-v2", "dialog"], width: "auto", height: "auto" }).render(true);
}
