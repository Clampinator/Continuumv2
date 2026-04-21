import { normalizeDateInput, parseDate } from '../../../span-graph-utils/provide-span-graph-utils.js';

/**
 * Handles the creation of the complex insertion span (Reconciliation).
 * This is the logic for inserting into existing level lines.
 */
export function createInsertedSpan(actor, formData, params) {
    const { mode, existingData } = params;

    // Solve basic coordinates (for insertion, we typically use the drop point)
    let finalAge = Number(params.ageRaw);
    let finalTime = Number(params.timeRaw);  // Departure time on the rail at the drop point
    const newId = (mode === 'edit') ? existingData.id : foundry.utils.randomID();

    // DIAGONAL AUTHORITY: If the user edited spanFromDate in the dialog, project it
    // onto the current rail to derive the correct age. This prevents the "horizontal
    // line" violation where the departure node sits off the rail because the click's
    // X position was kept while the Y (time) was overridden by user input.
    // Correct relationship: time = railOffset + age * 1000.
    if (formData.spanFromDate) {
        const fromDateObj = parseDate(`${normalizeDateInput(formData.spanFromDate)}T${formData.spanFromTime || '12:00:00'}`);
        if (fromDateObj) {
            const resolvedFromTime = fromDateObj.getTime();
            const railOffset = finalTime - (finalAge * 1000);  // Rail at the click point
            const projectedAge = (resolvedFromTime - railOffset) / 1000;
            if (projectedAge > 0) {
                finalAge = projectedAge;
                finalTime = resolvedFromTime;
            }
        }
    }

    return { finalAge, finalTime, newId, isSpan: true };
}
