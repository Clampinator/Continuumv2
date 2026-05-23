import { normalizeDateInput, parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { convertSecondsToDateString } from '/systems/continuum-v2/modules/temporal-translator/duration-converter.js';
import { SECONDS_IN_YEAR } from '/systems/continuum-v2/modules/temporal-engine/constants.js';
import { migrateEraEvents } from '/systems/continuum-v2/modules/state/migrate-era-events.js';
import { renderGraph } from './span-graph-render.js';
import { renderDatePicker } from './span-graph-ui-helpers.js';
import { ContextFinder } from './lifeline/services/context-finder.js';
import { activateDatePickers } from './date-picker.js';

/*
Dialog to create a new Era from drag selection.
*/
export function showCreateEraDialog(viewState, graphData, sheet, svg, durationSeconds, sortedEras) {
    const dobStr = sheet.actor.system.personal?.dob;
    const dobTs = dobStr ? parseDateToObjectiveMs(dobStr) : Date.now();
    const startStr = convertSecondsToDateString(viewState.creationStartAgeSeconds, dobTs);
    const endStr = convertSecondsToDateString(viewState.creationCurrentAgeSeconds, dobTs);

    // Calculate initial End Age in Years
    const endAgeYears = (viewState.creationCurrentAgeSeconds / SECONDS_IN_YEAR).toFixed(2);

    const content = `
        <form style="width: 100%;">
            <style>
                .continuum-dialog-compact { width: 96%; margin: 0 auto; }
                .continuum-dialog-compact .form-group { display: flex; align-items: center; margin-bottom: 8px; }
                .continuum-dialog-compact .form-group label { flex: 0 0 110px; margin-right: 10px; text-align: right; font-size: 0.9em; }
                .continuum-dialog-compact .form-group input { flex: 1; }
                .continuum-dialog-compact .date-picker-container { flex: 1; }
            </style>
            <div class="continuum-dialog-compact">
                <div class="form-group"><label>Era Name</label><input type="text" name="name" value="New Era" autofocus/></div>
                ${renderDatePicker("dateFrom", startStr, "Start Date")}
                ${renderDatePicker("dateTo", endStr, "End Date")}
                <div class="form-group">
                    <label>End Age (Years)</label>
                    <input type="number" name="endAge" value="${endAgeYears}" step="0.1" min="0" placeholder="Subjective Age at End"/>
                </div>
            </div>
        </form>
    `;

    new Dialog({
        eventTitle: "Create New Era",
        content: content,
        render: (html) => {
            activateDatePickers(html);
            html.find("input[type='text'], input[type='number']").on("focus", event => event.currentTarget.select());

            const dateFromInput = html.find('input[name="dateFrom"]');
            const dateToInput = html.find('input[name="dateTo"]');
            const endAgeInput = html.find('input[name="endAge"]');

            // Listener: Update Date when Age changes
            // TTL-compliant: parse via TTL, compute end timestamp, format back
            endAgeInput.on('change', () => {
                const targetAgeYears = parseFloat(endAgeInput.val());
                if (isNaN(targetAgeYears)) return;

                const targetAgeSeconds = targetAgeYears * SECONDS_IN_YEAR;
                const durationSecs = targetAgeSeconds - viewState.creationStartAgeSeconds;

                const sVal = dateFromInput.val();
                if (!sVal) return;

                const startMs = parseDateToObjectiveMs(sVal);
                if (!startMs) return;

                // Calculate new End Date based on duration
                const endMs = startMs + (durationSecs * 1000);
                const endD = new Date(endMs);

                const y = endD.getUTCFullYear();
                const m = String(endD.getUTCMonth() + 1).padStart(2, '0');
                const d = String(endD.getUTCDate()).padStart(2, '0');

                dateToInput.val(`${y}-${m}-${d}`);
            });

            // Listener: Update Age when Dates change
            // TTL-compliant: parse both dates via TTL, compute duration
            const updateAgeFromDates = () => {
                const sVal = dateFromInput.val();
                const eVal = dateToInput.val();
                if (!sVal || !eVal) return;

                const startMs = parseDateToObjectiveMs(sVal);
                const endMs = parseDateToObjectiveMs(eVal);

                if (!startMs || !endMs) return;

                const durationMs = endMs - startMs;
                const durationSecs = durationMs / 1000;

                const newEndAgeSeconds = viewState.creationStartAgeSeconds + durationSecs;
                const newAgeYears = (newEndAgeSeconds / SECONDS_IN_YEAR).toFixed(2);

                endAgeInput.val(newAgeYears);
            };

            dateToInput.on('change', updateAgeFromDates);
            dateFromInput.on('change', updateAgeFromDates);
        },
        buttons: {
            create: {
                label: "Create",
                icon: '<i class="fas fa-check"></i>',
                callback: async (html) => {
                    const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    const newEraId = foundry.utils.randomID();

                    // Determine Sort Order
                    let newSort = 0;
                    if (sortedEras.length > 0) {
                        const sorts = sortedEras.map(a => Number(a.sort) || 0);
                        newSort = Math.max(...sorts) + 1000;
                    }

                    await sheet.actor.update({
                        [`system.eras.${newEraId}`]: {
                            id: newEraId,
                            name: formData.name,
                            dateFrom: normalizeDateInput(formData.dateFrom),
                            dateTo: normalizeDateInput(formData.dateTo),
                            age: viewState.creationStartAgeSeconds,
                            experiences: {},
                            sort: newSort
                        }
                    });

                    // New era may split existing era boundaries - migrate events
                    const migrationUpdates = migrateEraEvents(sheet.actor);
                    if (Object.keys(migrationUpdates).length > 0) {
                        await sheet.actor.update(migrationUpdates);
                    }

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
    }, { classes: ["continuum-v2", "dialog"], width: 440 }).render(true);
}

/*
Dialog to create a new Experience from drag selection.
*/
export function showCreateExperienceDialog(viewState, graphData, sheet, svg, durationSeconds, startAgeSeconds) {
    const dobTs = sheet.actor.system.personal?.dob ? parseDateToObjectiveMs(sheet.actor.system.personal.dob) : Date.now();
    const startStr = convertSecondsToDateString(startAgeSeconds, dobTs);
    const endStr = convertSecondsToDateString(startAgeSeconds + durationSeconds, dobTs);

    // Use service-based hit detection
    const context = ContextFinder.getHitContext(startAgeSeconds, graphData);
    const eraId = context ? context.eraId : null;

    if (!eraId || eraId === 'NEW_ERA') {
        ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.CreateEraFirst"));
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
            </style>
            <div class="continuum-dialog-compact">
                <div class="form-group"><label>Experience Name</label><input type="text" name="name" value="New Experience" autofocus/></div>
                ${renderDatePicker("dateFrom", startStr, "Start Date")}
                ${renderDatePicker("dateTo", endStr, "End Date")}
            </div>
        </form>
    `;

    new Dialog({
        eventTitle: "Create New Experience",
        content: content,
        render: (html) => {
            activateDatePickers(html);
            html.find("input[type='text'], input[type='number']").on("focus", event => event.currentTarget.select());
        },
        buttons: {
            create: {
                label: "Create",
                icon: '<i class="fas fa-check"></i>',
                callback: async (html) => {
                    const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
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
                            events: {},
                            color: "#2a2a2a",
                            sort: newSort
                        }
                    });

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
    }, { classes: ["continuum-v2", "dialog"], width: 440 }).render(true);
}
