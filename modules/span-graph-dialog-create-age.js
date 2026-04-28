import { normalizeDateInput, convertTimestampToDateString, SECONDS_IN_YEAR, SECONDS_IN_DAY, getObjectiveDateFromSubjectiveX } from './span-graph-utils/provide-span-graph-utils.js';
import { renderGraph } from './span-graph-render.js';
import { renderDatePicker } from './span-graph-ui-helpers.js';
import { activateDatePickers } from './date-picker.js';
import { Sound } from './sound-manager.js';

// Logic constants to match parseAgeString logic for consistency
const SECONDS_IN_MONTH = 2592000; // 30 days

/*
Dialog to create a new Era from drag selection.
*/
export function showCreateEraDialog(viewState, graphData, sheet, svg, durationSeconds, sortedEras) {
    const dobString = sheet.actor.system.personal?.dob || sheet.actor.system.structure?.inceptionDate || null;
    const dobDate = dobString ? new Date(dobString + "T00:00:00") : new Date();
    const points = (graphData.levelNodes || []).map(n => ({ x: n.age, y: n.time }));

    // The first era on any character MUST start at the birth date, regardless of
    // where the user dragged the creation bar. Subsequent eras use the drag position.
    const isFirstEra = sortedEras.length === 0;
    const startStr = isFirstEra
        ? (dobString || convertTimestampToDateString(dobDate.getTime()).date)
        : convertTimestampToDateString(getObjectiveDateFromSubjectiveX(viewState.creationStartAgeSeconds, points, dobDate).getTime()).date;

    const endDate = getObjectiveDateFromSubjectiveX(viewState.creationCurrentAgeSeconds, points, dobDate);
    const endStr = convertTimestampToDateString(endDate.getTime()).date;

    // Decompose current absolute subjective age into Y, M, D
    const totalSecs = viewState.creationCurrentAgeSeconds;
    const initialY = Math.floor(totalSecs / SECONDS_IN_YEAR);
    const remY = totalSecs % SECONDS_IN_YEAR;
    const initialM = Math.floor(remY / SECONDS_IN_MONTH);
    const initialD = Math.floor((remY % SECONDS_IN_MONTH) / SECONDS_IN_DAY);

    const content = `
        <form style="width: 100%;">
            <style>
                .continuum-dialog-compact { width: 96%; margin: 0 auto; }
                .continuum-dialog-compact .form-group { display: flex; align-items: center; margin-bottom: 8px; }
                .continuum-dialog-compact .form-group label { flex: 0 0 110px; margin-right: 10px; text-align: right; font-size: 0.9em; }
                .continuum-dialog-compact .form-group input { flex: 1; }
                .continuum-dialog-compact .date-picker-container { flex: 1; }
                .age-inputs-row { display: flex; gap: 5px; flex: 1; }
                .age-inputs-row .age-field-group { display: flex; flex-direction: column; flex: 1; align-items: center; }
                .age-inputs-row .age-field-group label { flex: none; margin: 0; font-size: 0.7em; color: #888; text-transform: uppercase; }
                .age-inputs-row .age-field-group input { text-align: center; width: 100%; }
            </style>
            <div class="continuum-dialog-compact">
                <div class="form-group"><label>Era Name</label><input type="text" name="name" value="New Era" autofocus/></div>
                ${renderDatePicker("dateFrom", startStr, "Start Date")}
                ${renderDatePicker("dateTo", endStr, "End Date")}
                <div class="form-group">
                    <label>End Age</label>
                    <div class="age-inputs-row">
                        <div class="age-field-group">
                            <input type="number" name="endYears" value="${initialY}" min="0" placeholder="0"/>
                            <label>Years</label>
                        </div>
                        <div class="age-field-group">
                            <input type="number" name="endMonths" value="${initialM}" min="0" max="11" placeholder="0"/>
                            <label>Months</label>
                        </div>
                        <div class="age-field-group">
                            <input type="number" name="endDays" value="${initialD}" min="0" max="29" placeholder="0"/>
                            <label>Days</label>
                        </div>
                    </div>
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
            const endYInput = html.find('input[name="endYears"]');
            const endMInput = html.find('input[name="endMonths"]');
            const endDInput = html.find('input[name="endDays"]');

            // SYNC: AGE INPUTS -> DATE TO
            const updateDateFromAge = () => {
                const y = parseInt(endYInput.val()) || 0;
                const m = parseInt(endMInput.val()) || 0;
                const d = parseInt(endDInput.val()) || 0;

                const targetTotalSecs = (y * SECONDS_IN_YEAR) + (m * SECONDS_IN_MONTH) + (d * SECONDS_IN_DAY);
                const durationNeeded = targetTotalSecs - viewState.creationStartAgeSeconds;

                const sVal = dateFromInput.val();
                if (!sVal) return;

                const startD = new Date(sVal + "T00:00:00");
                if (isNaN(startD.getTime())) return;

                const endD = new Date(startD.getTime() + (durationNeeded * 1000));

                const outY = endD.getFullYear();
                const outM = String(endD.getMonth() + 1).padStart(2, '0');
                const outD = String(endD.getDate()).padStart(2, '0');

                dateToInput.val(`${outY}-${outM}-${outD}`);
            };

            [endYInput, endMInput, endDInput].forEach(el => el.on('change', updateDateFromAge));

            // SYNC: DATES -> AGE INPUTS
            const updateAgeFromDates = () => {
                const sVal = dateFromInput.val();
                const eVal = dateToInput.val();
                if (!sVal || !eVal) return;

                const startD = new Date(sVal + "T00:00:00");
                const endD = new Date(eVal + "T00:00:00");

                if (isNaN(startD.getTime()) || isNaN(endD.getTime())) return;

                const durationMs = endD.getTime() - startD.getTime();
                const durationSecs = durationMs / 1000;

                const absoluteEndAgeSecs = viewState.creationStartAgeSeconds + durationSecs;

                const y = Math.floor(absoluteEndAgeSecs / SECONDS_IN_YEAR);
                const remY = absoluteEndAgeSecs % SECONDS_IN_YEAR;
                const m = Math.floor(remY / SECONDS_IN_MONTH);
                const d = Math.floor((remY % SECONDS_IN_MONTH) / SECONDS_IN_DAY);

                endYInput.val(y);
                endMInput.val(m);
                endDInput.val(d);
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
                    const newId = foundry.utils.randomID();

                    let newSort = 0;
                    if (sortedEras.length > 0) {
                        const sorts = sortedEras.map(a => Number(a.sort) || 0);
                        newSort = Math.max(...sorts) + 1000;
                    }

                    await sheet.actor.update({
                        [`system.eras.${newId}`]: {
                            id: newId,
                            name: formData.name,
                            dateFrom: normalizeDateInput(formData.dateFrom),
                            dateTo: normalizeDateInput(formData.dateTo),
                            age: isFirstEra ? 0 : viewState.creationStartAgeSeconds,
                            experiences: {},
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
    }, { classes: ["continuum-v2", "dialog"], width: 440 }).render(true);
}
