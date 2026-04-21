import { normalizeDateInput, convertTimestampToDateString } from '../span-graph-utils/provide-span-graph-utils.js';
import { renderOrgGraph } from './org-render.js';
import { renderDatePickerInput } from '../span-graph-ui-helpers.js';
import { activateDatePickers } from '../date-picker.js';

export function showYetDialog(viewState, graphData, sheet, svg, existingData = null) {
    viewState.interactionMode = 'dialog-open';
    const isEdit = !!existingData;
    const description = isEdit ? existingData.description : "";

    const rect = svg.getBoundingClientRect();
    const pX = viewState.pointerDownX - rect.left;
    const pY = viewState.pointerDownY - rect.top;
    const worldTime = (pY - viewState.y) / viewState.scaleY;
    const dt = convertTimestampToDateString(worldTime);

    const content = `
        <form>
            <div class="form-group">
                <label>The Yet (Description)</label>
                <input type="text" name="description" value="${description}" autofocus placeholder="What must come to pass?"/>
            </div>
            <div class="form-group">
                <label>Locked Date</label>
                ${renderDatePickerInput("date", isEdit ? existingData.date : dt.date)}
            </div>
            <div class="form-group">
                <label>Locked Time</label>
                <input type="time" name="time" step="1" value="${isEdit ? existingData.time : dt.time}"/>
            </div>
        </form>
    `;

    new Dialog({
        title: isEdit ? "Edit Yet" : "Define Yet",
        content: content,
        render: (html) => activateDatePickers(html),
        buttons: {
            save: {
                label: "Save",
                icon: '<i class="fas fa-check"></i>',
                callback: async (html) => {
                    const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    const id = isEdit ? existingData.id : foundry.utils.randomID();
                    const updates = {
                        [`system.theYet.${id}.description`]: formData.description,
                        [`system.theYet.${id}.date`]: normalizeDateInput(formData.date),
                        [`system.theYet.${id}.time`]: formData.time
                    };
                    if (!isEdit) {
                        updates[`system.theYet.${id}.done`] = false;
                        updates[`system.theYet.${id}.frag`] = 0;
                    }
                    await sheet.actor.update(updates);
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "save",
        close: () => {
            viewState.interactionMode = 'pan';
            renderOrgGraph(svg, viewState, graphData);
        }
    }, { classes: ["continuum-v2", "dialog"] }).render(true);
}
