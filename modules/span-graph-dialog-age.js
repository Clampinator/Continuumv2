// continuum/modules/span-graph-dialog-age.js
import { parseSubjectiveAge, formatSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { normalizeDateInput, parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { Sound } from './sound-manager.js';

/**
 * Era edit dialog. Allows editing name, start age, and end age.
 *
 * PERSISTENCE: On save, writes era.age (startAge in seconds),
 * dateFrom, and dateTo to the actor. This ensures computeEraBoundaries
 * can read era.age as the authoritative start position and derive
 * endAge from dateTo - dateFrom via TTL.
 *
 * The dialog shows age as subjective strings (e.g. "17y 2m") and
 * converts to/from seconds using the TTL age converter.
 */
export function openEraEditDialog(data, sheet, viewState) {
    const dobStr = sheet.actor.system.personal.dob;
    const dobTs = dobStr ? parseDateToObjectiveMs(dobStr) : Date.now();

    // Start age from era.age (authoritative) or derive from dateFrom
    const startAgeSeconds = Number(data.age) || 0;
    const startAgeStr = startAgeSeconds > 0 ? formatSubjectiveAge(startAgeSeconds) : '';

    // End age: derive from era.age + (dateTo - dateFrom) in seconds
    let endAgeSeconds = 0;
    if (data.dateTo && data.dateFrom) {
        const startMs = parseDateToObjectiveMs(data.dateFrom);
        const endMs = parseDateToObjectiveMs(data.dateTo);
        if (!isNaN(startMs) && !isNaN(endMs)) {
            endAgeSeconds = startAgeSeconds + ((endMs - startMs) / 1000);
        }
    }
    const endAgeStr = endAgeSeconds > 0 ? formatSubjectiveAge(endAgeSeconds) : '';

    const content = `
        <form autocomplete="off">
            <div class="form-group"><label>Era Name</label><input type="text" name="name" value="${data.name || 'Untitled'}" autofocus/></div>
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
        eventTitle: "Edit Era",
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

                    // Start age: always write era.age (authoritative for computeEraBoundaries)
                    if (formData.startAge && formData.startAge.trim() !== '') {
                        const startSec = parseSubjectiveAge(formData.startAge);
                        updates[`system.eras.${data.id}.age`] = startSec;

                        // Derive dateFrom from age + DOB
                        if (!isNaN(dobTs)) {
                            const fromDate = new Date(dobTs + (startSec * 1000));
                            updates[`system.eras.${data.id}.dateFrom`] = fromDate.toISOString().split('T')[0];
                        }
                    }

                    // End age: derive dateTo from endAge seconds - startAge seconds + dateFrom
                    if (formData.endAge && formData.endAge.trim() !== '') {
                        const endSec = parseSubjectiveAge(formData.endAge);
                        const startSec = parseSubjectiveAge(formData.startAge) || Number(data.age) || 0;
                        const durationSec = endSec - startSec;

                        // Derive dateTo from dateFrom + duration
                        const dateFromStr = updates[`system.eras.${data.id}.dateFrom`] || data.dateFrom;
                        if (dateFromStr && !isNaN(dobTs)) {
                            const fromMs = parseDateToObjectiveMs(dateFromStr);
                            if (!isNaN(fromMs)) {
                                const toDate = new Date(fromMs + (durationSec * 1000));
                                updates[`system.eras.${data.id}.dateTo`] = toDate.toISOString().split('T')[0];
                            }
                        }
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