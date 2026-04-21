import { normalizeDateInput, convertSecondsToDateString } from '../span-graph-utils/provide-span-graph-utils.js';
import { renderOrgGraph } from './org-render.js';
import { renderDatePicker } from '../span-graph-ui-helpers.js';
import { activateDatePickers } from '../date-picker.js';
import { ContextFinder } from '../lifeline/services/context-finder.js';
import { Sound } from '../sound-manager.js';

export function showInsertExperienceDialog(viewState, graphData, sheet, svg, durationSeconds, startAgeSeconds) {
    viewState.interactionMode = 'dialog-open';

    const context = ContextFinder.getHitContext(startAgeSeconds, graphData);
    const eraId = context ? context.eraId : null;

    if (!eraId) {
        ui.notifications.warn("Please create a Phase first.");
        viewState.interactionMode = 'pan';
        renderOrgGraph(svg, viewState, graphData);
        return;
    }

    const inceptionTs = graphData.dobTimestamp;
    const startStr = convertSecondsToDateString(startAgeSeconds, inceptionTs);
    const endStr = convertSecondsToDateString(startAgeSeconds + durationSeconds, inceptionTs);

    const content = `
        <form style="width: 100%;">
            <div class="form-group"><label>Operation Name</label><input type="text" name="name" value="New Operation" autofocus/></div>
            ${renderDatePicker("dateFrom", startStr, "Start Date")}
            ${renderDatePicker("dateTo", endStr, "End Date")}
        </form>
    `;

    new Dialog({
        title: "Create New Operation",
        content: content,
        render: (html) => {
            activateDatePickers(html);
            html.find("input").on("focus", event => event.currentTarget.select());
        },
        buttons: {
            create: {
                label: "Create",
                icon: '<i class="fas fa-check"></i>',
                callback: async (html) => {
                    const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    const newId = foundry.utils.randomID();
                    await sheet.actor.update({
                        [`system.phases.${eraId}.operations.${newId}`]: {
                            id: newId,
                            name: formData.name,
                            dateFrom: normalizeDateInput(formData.dateFrom),
                            dateTo: normalizeDateInput(formData.dateTo),
                            engagements: {}
                        }
                    });
                    Sound.confirm();
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "create",
        close: () => {
            viewState.interactionMode = 'pan';
            renderOrgGraph(svg, viewState, graphData);
        }
    }, { classes: ["continuum-v2", "dialog"] }).render(true);
}
