import { resolveNarrativeOrder } from '/systems/continuum-v2/modules/temporal-kernel/resolve-narrative-order.js';
import { normalizeDateInput, parseDate } from '/systems/continuum-v2/modules/span-graph-utils/provide-span-graph-utils.js';

/**
 * Handles the chronological re-indexing logic for nodes using the Temporal Kernel.
 * REBUILT: ADI-compliant narrative sequencing.
 */
export function processReindexing(actor, newId, mode, intent, params, updates) {
    const { finalAge, finalTime, isSpan, ageChanged, timeChanged } = intent;
    const { existingData, graphData } = params;

    // 1. Detect if physical position changed (The Trigger)
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

    if (!positionChanged) {
        return { 
            authoritativeAge: existingData?.age ?? finalAge, 
            authoritativeTime: finalTime, 
            authoritativeSort: existingData?.sort ?? 0, 
            positionChanged: false 
        };
    }

    // 2. Gather History in Kernel-format
    // We use the ADI RenderNodes which already have x (age) and y (ts)
    const history = (graphData?.nodes || []).map(n => ({
        id: n.id,
        x: Number(n.x),
        y: Number(n.y),
        sort: Number(n.sort) || 0,
        created: n.record?.createdAt || 0,
        path: n.path, // We need path to generate updates for shifts
        isNow: !!n.isNow
    }));

    // 3. Resolve Target coordinates
    let sortTime = finalTime;
    if (isSpan) {
        const depDate = normalizeDateInput(params.formData.spanFromDate);
        const depTimeStr = params.formData.spanFromTime || "12:00:00";
        const depDateObj = parseDate(`${depDate}T${depTimeStr}`);
        sortTime = depDateObj ? depDateObj.getTime() : finalTime;
    }

    const target = { id: newId, x: finalAge, y: sortTime };

    // 4. CALL KERNEL (Physics sequences Narrative)
    const result = resolveNarrativeOrder(history, target, { isLog: mode === 'log' });

    // 5. Apply Results
    result.shifts.forEach(shift => {
        if (shift.path) {
            updates[`${shift.path}.sort`] = shift.sort;
        }
    });

    return { 
        authoritativeAge: finalAge, 
        authoritativeTime: finalTime, 
        authoritativeSort: result.sort, 
        positionChanged: true 
    };
}
