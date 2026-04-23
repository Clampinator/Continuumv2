import { reindexLifelineNodes } from '../../../chronology/reindex-lifeline-nodes.js';
import { normalizeDateInput, parseDate } from '../../../../../span-graph-utils/provide-span-graph-utils.js';

/**
 * Handles the chronological re-indexing logic for nodes.
 */
export function processReindexing(actor, newId, mode, intent, params, updates) {
    const { finalAge, finalTime, isSpan, ageChanged, timeChanged } = intent;
    const { existingData, graphData } = params;

    let positionChanged = true;
    if (mode === 'edit') {
        if (!isSpan) {
            positionChanged = ageChanged || timeChanged;
        } else {
            const oldFrom = `${existingData?.spanFromDate || ''}|${existingData?.spanFromTime || '12:00:00'}`;
            const oldTo = `${existingData?.spanToDate || ''}|${existingData?.spanToTime || '12:00:00'}`;
            const newFrom = `${normalizeDateInput(params.formData.spanFromDate || '')}|${params.formData.spanFromTime || '12:00:00'}`;
            const newTo = `${normalizeDateInput(params.formData.spanToDate || '')}|${params.formData.spanToTime || '12:00:00'}`;
            positionChanged = (oldFrom !== newFrom || oldTo !== newTo);
        }
    }

    let authoritativeAge, authoritativeTime, authoritativeSort;

    if (positionChanged) {
        let sortTime = finalTime;
        if (isSpan) {
            const depDate = normalizeDateInput(params.formData.spanFromDate);
            const depTimeStr = params.formData.spanFromTime || "12:00:00";
            const depDateObj = parseDate(`${depDate}T${depTimeStr}`);
            sortTime = depDateObj ? depDateObj.getTime() : finalTime;
        }

        const reindexUpdates = reindexLifelineNodes(actor, newId, -1, { age: finalAge, time: sortTime }, {
            graphData,
            isLog: mode === 'log'
        });

        authoritativeAge = reindexUpdates.targetAge;
        authoritativeTime = reindexUpdates.targetTime;
        authoritativeSort = reindexUpdates.targetSortValue;

        delete reindexUpdates.targetAge;
        delete reindexUpdates.targetTime;
        delete reindexUpdates.targetSortValue;
        Object.assign(updates, reindexUpdates);
    } else {
        authoritativeAge = existingData?.age ?? finalAge;
        authoritativeTime = finalTime;
        authoritativeSort = existingData?.sort ?? 0;
    }

    return { authoritativeAge, authoritativeTime, authoritativeSort, positionChanged };
}
