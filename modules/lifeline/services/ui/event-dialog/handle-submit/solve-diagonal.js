import { normalizeDateInput, parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { parseSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { calculateRailOffset } from './calculate-rail-offset.js';
import { projectObjectiveTime, projectSubjectiveAge } from '/systems/continuum-v2/modules/temporal-kernel/project-subjective-age.js';

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
        const inputAge = parseSubjectiveAge(String(formData.eventAge || ""));
        const inputDate = normalizeDateInput(formData.eventDate);
        const inputTime = formData.eventTime || "12:00:00";
        const inputTs = parseDateToObjectiveMs(inputDate, inputTime) || finalTime;
        
        const baseAge = (mode === 'edit') ? (existingData.eventAge || 0) : Number(params.ageRaw);
        const baseTime = (mode === 'edit') ? params.timeRaw : params.timeRaw;

        const ageChanged = Math.abs(inputAge - baseAge) > 0.001;
        const timeChanged = Math.abs(inputTs - baseTime) > 1000; // 1 second threshold

        // THE AUTHORITY: Solve relative to the node's CURRENT rail offset to prevent jumps.
        const currentRailOffset = calculateRailOffset(actor, baseAge, baseTime);

        if (ageChanged && !timeChanged) {
            // Age was edited: Solve for Time
            finalAge = inputAge;
            finalTime = projectObjectiveTime(finalAge, currentRailOffset);
        } else if (timeChanged) {
            // Date/Time was edited: Solve for Age
            finalTime = inputTs;
            finalAge = projectSubjectiveAge(finalTime, currentRailOffset);
        }
    } else if (mode === 'log') {
        // AUTHORITY: In Log Mode, the dragged coordinates ARE the truth.
        // We do not solve for rail here; we let the drag define the new position.
        finalAge = parseSubjectiveAge(String(formData.eventAge || params.ageRaw || 0));
        const inputDate = normalizeDateInput(formData.eventDate || formData.eventSpanToDate);
        const inputTime = formData.eventTime || formData.eventSpanToTime || "12:00:00";
        const parsedMs = parseDateToObjectiveMs(inputDate, inputTime);
        if (parsedMs) finalTime = parsedMs;
    } else {
        // AUTHORITY: For Spans, we honor BOTH the Subjective Age and the Objective Date.
        finalAge = parseSubjectiveAge(String(formData.eventAge || ""));
        const inputDate = normalizeDateInput(formData.eventSpanToDate);
        const inputTime = formData.eventSpanToTime || "12:00:00";
        const parsedMs = parseDateToObjectiveMs(inputDate, inputTime);
        
        if (parsedMs) {
            finalTime = parsedMs;
        }
    }

    return { finalAge, finalTime };
}
