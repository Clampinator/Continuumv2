import { normalizeDateInput, convertSecondsToDateString, SECONDS_IN_YEAR } from '../span-graph-utils/provide-span-graph-utils.js';
import { renderOrgGraph } from './org-render.js';
import { renderDatePicker } from '../span-graph-ui-helpers.js';
import { activateDatePickers } from '../date-picker.js';
import { Sound } from '../sound-manager.js';

export function showCreatePhaseDialog(viewState, graphData, sheet, svg, durationSeconds, sortedPhases) {
    viewState.interactionMode = 'dialog-open';
    const inceptionTs = graphData.dobTimestamp;
    const startStr = convertSecondsToDateString(viewState.creationStartAgeSeconds, inceptionTs);
    const endStr = convertSecondsToDateString(viewState.creationCurrentAgeSeconds, inceptionTs);
    const endAgeYears = (viewState.creationCurrentAgeSeconds / SECONDS_IN_YEAR).toFixed(2);

    const content = `
        <form>
            <div class="form-group"><label>Phase Name</label><input type="text" name="name" value="New Phase" autofocus/></div>
            ${renderDatePicker("dateFrom", startStr, "Start Date")}
            ${renderDatePicker("dateTo", endStr, "End Date")}
            <div class="form-group">
                <label>End Age (Years)</label>
                <input type="number" name="endAge" value="${endAgeYears}" step="0.1" min="0" />
            </div>
        </form>
    `;

    new Dialog({
        title: "Create New Phase",
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
                    let newSort = 0;
                    if (sortedPhases && sortedPhases.length > 0) {
                        const sorts = sortedPhases.map(a => Number(a.sort) || 0);
                        newSort = Math.max(...sorts) + 1000;
                    }
                    await sheet.actor.update({
                        [`system.phases.${newId}`]: {
                            id: newId,
                            name: formData.name,
                            dateFrom: normalizeDateInput(formData.dateFrom),
                            dateTo: normalizeDateInput(formData.dateTo),
                            operations: {},
                            sort: newSort
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
