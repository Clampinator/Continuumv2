import { normalizeDateInput } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { parseDate } from '../../../span-graph-utils/provide-span-graph-utils.js';
import { computeOffsetFromArrival, projectSubjectiveAge } from '/systems/continuum-v2/modules/temporal-kernel/project-subjective-age.js';

/**
 * Handles the creation of the complex insertion span (Reconciliation).
 * This is the logic for inserting into existing level lines.
 *
 * When called from the interactive drag flow, the insertionContext provides
 * pre-computed departure coordinates and the displacementResult provides
 * the arrival time. In this case, the dialog's form data can override the
 * drag values if the user edits them manually.
 *
 * When called from a simple click (no drag), it resolves coordinates from
 * the dialog form data alone.
 */
export function createInsertedSpan(actor, formData, params) {
    const { mode, existingData, insertionContext } = params;

    const newId = (mode === 'edit') ? existingData.id : foundry.utils.randomID();

    // INTERACTIVE DRAG PATH: If we have insertion context from a span drag,
    // use the departure age and time from the splice point computation.
    let finalAge, finalTime;

    if (insertionContext) {
        // The splice point already resolved the rail-projected coordinates
        finalAge = insertionContext.departureAge;
        finalTime = insertionContext.departureTime;

        // DIAGONAL AUTHORITY: If the user edited the departure date in the dialog,
        // project the edited time onto the rail to derive the correct age.
        if (formData.eventSpanFromDate) {
            const fromDateObj = parseDate(`${normalizeDateInput(formData.eventSpanFromDate)}T${formData.eventSpanFromTime || '12:00:00'}`);
            if (fromDateObj) {
                const resolvedFromTime = fromDateObj.getTime();
                const railOffset = computeOffsetFromArrival(finalTime, finalAge);
                const projectedAge = projectSubjectiveAge(resolvedFromTime, railOffset);
                if (projectedAge > 0) {
                    finalAge = projectedAge;
                    finalTime = resolvedFromTime;
                }
            }
        }
    } else {
        // FALLBACK: Simple click path - resolve from raw params
        finalAge = Number(params.ageRaw);
        finalTime = Number(params.timeRaw);

        if (formData.eventSpanFromDate) {
            const fromDateObj = parseDate(`${normalizeDateInput(formData.eventSpanFromDate)}T${formData.eventSpanFromTime || '12:00:00'}`);
            if (fromDateObj) {
                const resolvedFromTime = fromDateObj.getTime();
                const railOffset = computeOffsetFromArrival(finalTime, finalAge);
                const projectedAge = projectSubjectiveAge(resolvedFromTime, railOffset);
                if (projectedAge > 0) {
                    finalAge = projectedAge;
                    finalTime = resolvedFromTime;
                }
            }
        }
    }

    return { finalAge, finalTime, newId, eventIsSpan: true };
}