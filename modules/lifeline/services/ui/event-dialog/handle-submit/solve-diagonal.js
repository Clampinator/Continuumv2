import { normalizeDateInput, parseAgeString, parseDate } from '../../../../../span-graph-utils/provide-span-graph-utils.js';
import { calculateRailOffset } from './calculate-rail-offset.js';

/**
 * Solves the Bidirectional Diagonal for Leveling or Spanning events.
 * @param {Actor} actor
 * @param {object} formData
 * @param {object} params
 * @returns {object} { finalAge, finalTime }
 */
export function solveDiagonal(actor, formData, params) {
    const { mode, existingData, eventIsSpan } = params;
    let finalAge = Number(params.ageRaw);
    let finalTime = Number(params.timeRaw);

    if (!eventIsSpan && mode !== 'log') {
        const inputAge = parseAgeString(String(formData.eventAge || ""));
        const inputDate = normalizeDateInput(formData.eventDate);
        const inputTime = formData.eventTime || "12:00:00";
        const inputDateObj = parseDate(`${inputDate}T${inputTime}`);
        const inputTs = inputDateObj ? inputDateObj.getTime() : finalTime;
        
        const baseAge = (mode === 'edit') ? (existingData.eventAge || 0) : Number(params.ageRaw);
        const baseTime = (mode === 'edit') ? params.timeRaw : params.timeRaw;

        const ageChanged = Math.abs(inputAge - baseAge) > 0.001;
        const timeChanged = Math.abs(inputTs - baseTime) > 1000; // 1 second threshold

        // THE AUTHORITY: Solve relative to the node's CURRENT rail offset to prevent jumps.
        const currentRailOffset = calculateRailOffset(actor, baseAge, baseTime);

        if (ageChanged && !timeChanged) {
            // Age was edited: Solve for Time
            finalAge = inputAge;
            finalTime = currentRailOffset + (finalAge * 1000);
        } else if (timeChanged) {
            // Date/Time was edited: Solve for Age
            finalTime = inputTs;
            finalAge = (finalTime - currentRailOffset) / 1000;
        }
    } else if (mode === 'log') {
        // AUTHORITY: In Log Mode, the dragged coordinates ARE the truth.
        // We do not solve for rail here; we let the drag define the new position.
        finalAge = parseAgeString(String(formData.eventAge || params.ageRaw || 0));
        const inputDate = normalizeDateInput(formData.eventDate || formData.eventSpanToDate);
        const inputTime = formData.eventTime || formData.eventSpanToTime || "12:00:00";
        const inputDateObj = parseDate(`${inputDate}T${inputTime}`);
        if (inputDateObj) finalTime = inputDateObj.getTime();
    } else {
        // AUTHORITY: For Spans, we honor BOTH the Subjective Age and the Objective Date.
        finalAge = parseAgeString(String(formData.eventAge || ""));
        const inputDate = normalizeDateInput(formData.eventSpanToDate);
        const inputTime = formData.eventSpanToTime || "12:00:00";
        const inputDateObj = parseDate(`${inputDate}T${inputTime}`);
        
        if (inputDateObj) {
            finalTime = inputDateObj.getTime();
        }
    }

    return { finalAge, finalTime };
}
