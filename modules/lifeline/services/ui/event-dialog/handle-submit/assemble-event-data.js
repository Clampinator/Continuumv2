import { normalizeDateInput, convertTimestampToDateString } from '../../../../../span-graph-utils/provide-span-graph-utils.js';

/**
 * Assembles the core event data object.
 * @param {object} formData
 * @param {object} params
 * @returns {object}
 */
export function assembleEventData(formData, params) {
    const { newId, eventIsSpan, authoritativeAge, authoritativeSort, existingData, finalTime, viewState, mode } = params;

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
        eventTitle: formData.eventTitle,
        eventNotes: formData.eventNotes,
        eventIsRest: Boolean(formData.eventIsRest && !eventIsSpan),
        eventIsSpan: eventIsSpan,
        age: authoritativeAge,
        sort: authoritativeSort,
        createdAt: existingData?.createdAt || Date.now(),
        startsExpId: existingData?.startsExpId || null,
        endsExpId: existingData?.endsExpId || null
    };

    if (eventIsSpan) {
        eventData.eventSpanFromDate = normalizeDateInput(formData.eventSpanFromDate || departureDT.date);
        eventData.eventSpanFromTime = formData.eventSpanFromTime || departureDT.time;
        eventData.eventSpanFromLocation = formData.eventSpanFromLocation || "";
        eventData.eventSpanFromLat = parseFloat(formData.eventSpanFromLat) || null;
        eventData.eventSpanFromLng = parseFloat(formData.eventSpanFromLng) || null;
        eventData.eventSpanFromZoom = parseInt(formData.eventSpanFromZoom) || null;

        eventData.eventSpanToDate = normalizeDateInput(formData.eventSpanToDate || resolvedDT.date);
        eventData.eventSpanToTime = formData.eventSpanToTime || resolvedDT.time;
        eventData.eventSpanToLocation = formData.eventSpanToLocation || "";
        eventData.eventSpanToLat = parseFloat(formData.eventSpanToLat) || null;
        eventData.eventSpanToLng = parseFloat(formData.eventSpanToLng) || null;
        eventData.eventSpanToZoom = parseInt(formData.eventSpanToZoom) || null;
    } else {
        eventData.date = resolvedDT.date;
        eventData.time = resolvedDT.time;
    }

    return eventData;
}
