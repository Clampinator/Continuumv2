import { normalizeDateInput, convertSecondsToDateString } from './span-graph-utils/provide-span-graph-utils.js';
import { renderGraph } from './span-graph-render.js';
import { renderDatePicker } from './span-graph-ui-helpers.js';
import { ContextFinder } from './lifeline/services/context-finder.js';
import { activateDatePickers } from './date-picker.js';
import { Sound } from './sound-manager.js';

export function showCreateExperienceDialog(viewState, graphData, sheet, svg, durationSeconds, startAgeSeconds) {
    const dobTs = sheet.actor.system.personal?.dob ? new Date(sheet.actor.system.personal.dob + "T00:00:00").getTime() : Date.now();
    const startStr = convertSecondsToDateString(startAgeSeconds, dobTs);
    const endStr = convertSecondsToDateString(startAgeSeconds + durationSeconds, dobTs);

    // Use service-based hit detection
    const context = ContextFinder.getHitContext(startAgeSeconds, graphData);
    const eraId = context ? context.eraId : null;

    if (!eraId || eraId === 'NEW_ERA') {
        ui.notifications.warn("Please create an Era first.");
        viewState.interactionMode = 'pan';
        renderGraph(svg, viewState, graphData);
        return;
    }

    const content = `
        <form style="width: 100%;">
            <style>
                .continuum-dialog-compact { width: 96%; margin: 0 auto; }
                .continuum-dialog-compact .form-group { display: flex; align-items: center; margin-bottom: 8px; }
                .continuum-dialog-compact .form-group label { flex: 0 0 110px; margin-right: 10px; text-align: right; font-size: 0.9em; }
                .continuum-dialog-compact .form-group input { flex: 1; }
                .continuum-dialog-compact .date-picker-container { flex: 1; }
                .ongoing-row { margin-left: 120px; display: flex; align-items: center; gap: 8px; margin-top: 5px; }
                .ongoing-row input { width: 20px; height: 20px; flex: none; cursor: pointer; }
                .ongoing-row label { color: #4a90e2; font-weight: bold; cursor: pointer; }
            </style>
            <div class="continuum-dialog-compact">
                <div class="form-group"><label>Experience Name</label><input type="text" name="name" value="New Experience" autofocus/></div>
                ${renderDatePicker("dateFrom", startStr, "Start Date")}
                ${renderDatePicker("dateTo", endStr, "End Date")}
                <div class="ongoing-row">
                    <input type="checkbox" name="isOngoing" id="create-exp-ongoing" />
                    <label for="create-exp-ongoing">Ongoing (Maintenance)</label>
                </div>
            </div>
        </form>
    `;

    new Dialog({
        title: "Create New Experience",
        content: content,
        render: (html) => {
            activateDatePickers(html);
            html.find("input[type='text'], input[type='number']").on("focus", event => event.currentTarget.select());
            
            // Logic: If user picks an end date, turn off ongoing
            html.find('input[name="dateTo"]').on('change', (e) => {
                if (e.target.value.trim() !== "") {
                    html.find('input[name="isOngoing"]').prop('checked', false);
                }
            });

            // Logic: If user checks ongoing, clear end date
            html.find('input[name="isOngoing"]').on('change', (e) => {
                if (e.target.checked) {
                    html.find('input[name="dateTo"]').val('').trigger('change');
                }
            });
        },
        buttons: {
            create: {
                label: "Create",
                icon: '<i class="fas fa-check"></i>',
                callback: async (html) => {
                    const formData = new FormDataExtended(html.find("form")[0]).object;
                    const newId = foundry.utils.randomID();
                    
                    const era = sheet.actor.system.eras[eraId];
                    const exps = Object.values(era.experiences || {});
                    let newSort = 0;
                    if (exps.length > 0) {
                        const sorts = exps.map(e => Number(e.sort) || 0);
                        newSort = Math.max(...sorts) + 1000;
                    }

                    await sheet.actor.update({
                        [`system.eras.${eraId}.experiences.${newId}`]: {
                            id: newId,
                            name: formData.name,
                            dateFrom: normalizeDateInput(formData.dateFrom),
                            dateTo: normalizeDateInput(formData.dateTo),
                            isOngoing: !!formData.isOngoing,
                            events: {},
                            color: "#2a2a2a",
                            sort: newSort
                        }
                    });

                    Sound.confirm();
                    viewState.interactionMode = 'pan';
                    sheet.render();
                }
            },
            cancel: {
                label: "Cancel",
                callback: () => {
                    viewState.interactionMode = 'pan';
                    renderGraph(svg, viewState, graphData);
                }
            }
        },
        default: "create",
        close: () => {
            if (viewState.interactionMode === 'dialog-open') {
                viewState.interactionMode = 'pan';
                renderGraph(svg, viewState, graphData);
            }
        }
    }, { classes: ["continuum", "dialog"], width: "auto", height: "auto" }).render(true);
}