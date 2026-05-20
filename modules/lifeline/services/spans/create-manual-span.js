import { normalizeDateInput } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { parseDate } from '../../../span-graph-utils/provide-span-graph-utils.js';
import { parseSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { computeOffsetFromArrival, projectSubjectiveAge } from '/systems/continuum-v2/modules/temporal-kernel/project-subjective-age.js';

/**
 * Handles the creation of a single, monodirectional span.
 * This is the manual, real-time drag creation method.
 */
export function createManualSpan(actor, formData, params) {
    const { mode, existingData } = params;

    // Start from the raw drop/click/existing position.
    let finalAge = Number(params.ageRaw);
    let finalTime = Number(params.timeRaw);

    const newId = (mode === 'edit') ? existingData.id : foundry.utils.randomID();

    if (mode === 'edit') {
        // DIAGONAL AUTHORITY (edit): project eventSpanFromDate onto the current rail to derive
        // the correct departure age. Do NOT use formData.eventAge here — formatDuration writes
        // 'm' for minutes, but parseSubjectiveAge reads 'm' as months, corrupting the age.
        // params.timeRaw = old span's arrival time; params.ageRaw = old span's age.
        // For a span whose destination sits on the original rail: railOffset = dobTs exactly.
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
        // Log mode: the user may supply a subjective age override; otherwise use the drag position.
        // AUTHORITY: For Spans, we honor BOTH the Subjective Age and the Objective Date,
        // which allows the user to create "Fractures" (Time Dilation/Contraction).
        if (formData.eventAge && formData.eventAge.trim() !== "") {
            finalAge = parseSubjectiveAge(formData.eventAge);
        }
        // For log/insert, finalTime is the arrival (the drag end / eventSpanToDate).
        const inputDate = normalizeDateInput(formData.eventSpanToDate);
        const inputTime = formData.eventSpanToTime || "12:00:00";
        const inputDateObj = parseDate(`${inputDate}T${inputTime}`);
        if (inputDateObj) {
            finalTime = inputDateObj.getTime();
        }
    }

    return { finalAge, finalTime, newId, eventIsSpan: true };
}
