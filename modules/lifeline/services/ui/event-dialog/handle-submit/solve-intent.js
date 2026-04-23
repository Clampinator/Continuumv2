import { normalizeDateInput, parseAgeString, parseDate, formatSubjectiveAge } from '../../../../../span-graph-utils/provide-span-graph-utils.js';
import { createManualSpan } from '../../../spans/create-manual-span.js';
import { createInsertedSpan } from '../../../spans/create-inserted-span.js';

/**
 * Solves the user's intent from the form data to derive high-precision coordinates.
 * ADI REBUILT: Consistent coordinate derivation.
 */
export function solveIntent(actor, formData, params) {
    const { mode, existingData } = params;
    const isSpan = Boolean(formData.isSpan);

    let finalAge = Number(params.ageRaw);
    let finalTime = Number(params.timeRaw);
    let ageChanged = false;
    let timeChanged = false;
    let spanResult = null;

    if (!isSpan) {
        const inputAge = (formData.eventAge && formData.eventAge.trim() !== "") ? parseAgeString(formData.eventAge) : Number(params.ageRaw);
        const inputDate = normalizeDateInput(formData.eventDate);
        const inputTime = formData.eventTime || "12:00:00";
        const inputDateObj = parseDate(`${inputDate}T${inputTime}`);
        const inputTs = inputDateObj ? inputDateObj.getTime() : finalTime;
        
        const baseAge = (mode === 'edit') ? (existingData.age || 0) : Number(params.ageRaw);
        const baseTime = (mode === 'edit') ? finalTime : Number(params.timeRaw);

        const expectedAgeStr = formatSubjectiveAge(baseAge);
        ageChanged = (formData.eventAge || "").trim() !== expectedAgeStr;
        timeChanged = Math.abs(inputTs - baseTime) > 1000;

        const currentRailOffset = baseTime - (baseAge * 1000);

        if (ageChanged && !timeChanged) {
            finalAge = inputAge;
            finalTime = currentRailOffset + (finalAge * 1000);
        } else if (timeChanged) {
            finalTime = inputTs;
            finalAge = (finalTime - currentRailOffset) / 1000;
        } else if (mode === 'insert') {
            finalAge = Number(params.ageRaw);
            finalTime = Number(params.timeRaw);
        }
    } else {
        if (mode === 'log' || mode === 'edit') {
            spanResult = createManualSpan(actor, formData, params);
        } else if (mode === 'insert') {
            spanResult = createInsertedSpan(actor, formData, params);
        }

        if (spanResult) {
            finalAge = spanResult.finalAge;
            finalTime = spanResult.finalTime;
        }
    }

    return { finalAge, finalTime, ageChanged, timeChanged, isSpan };
}
