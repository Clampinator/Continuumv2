import { normalizeDateInput, convertTimestampToDateString } from '../../../../../span-graph-utils/provide-span-graph-utils.js';

/**
 * Assembles the core event data object.
 * @param {object} formData
 * @param {object} params
 * @returns {object}
 */
export function assembleEventData(formData, params) {
    const { newId, isSpan, authoritativeAge, authoritativeSort, existingData, finalTime, viewState, mode } = params;

    // AUTHORITY: Departure time is the node's ORIGINAL position in history.
    // We only use viewState.dragStartWorld for 'log' mode (dragging the Now node).
    // For 'edit' and 'insert', we MUST use params.timeRaw to avoid stale drag data contamination.
    const departureTime = (mode === 'log' && viewState?.dragStartWorld) 
        ? viewState.dragStartWorld.time 
        : params.timeRaw; 
    
    const departureDT = convertTimestampToDateString(departureTime);
    const resolvedDT = convertTimestampToDateString(finalTime);

    const eventData = {
        id: newId,
        title: formData.title,
        notes: formData.notes,
        isRest: Boolean(formData.isRest && !isSpan),
        isSpan: isSpan,
        age: authoritativeAge,
        sort: authoritativeSort,
        createdAt: existingData?.createdAt || Date.now(),
        startsExpId: existingData?.startsExpId || null
    };

    if (isSpan) {
        eventData.spanFromDate = normalizeDateInput(formData.spanFromDate || departureDT.date);
        eventData.spanFromTime = formData.spanFromTime || departureDT.time;
        eventData.spanFromLocation = formData.spanFromLocation || "";
        eventData.spanFromLat = parseFloat(formData.spanFromLat) || null;
        eventData.spanFromLng = parseFloat(formData.spanFromLng) || null;
        eventData.spanFromZoom = parseInt(formData.spanFromZoom) || null;

        eventData.spanToDate = normalizeDateInput(formData.spanToDate || resolvedDT.date);
        eventData.spanToTime = formData.spanToTime || resolvedDT.time;
        eventData.spanToLocation = formData.spanToLocation || "";
        eventData.spanToLat = parseFloat(formData.spanToLat) || null;
        eventData.spanToLng = parseFloat(formData.spanToLng) || null;
        eventData.spanToZoom = parseInt(formData.spanToZoom) || null;
    } else {
        eventData.date = resolvedDT.date;
        eventData.time = resolvedDT.time;
    }

    return eventData;
}
