import { normalizeDateInput, timestampToDateString } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';

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
    
    const departureDT = timestampToDateString(departureTime);
    const resolvedDT = timestampToDateString(finalTime);

    const eventData = {
        id: newId,
        eventTitle: formData.eventTitle,
        eventNotes: formData.eventNotes || formData.description || '',
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
        // Use ternary instead of parseFloat(x) || null to avoid falsy-zero bug
        // (latitude 0 = equator, longitude 0 = prime meridian)
        eventData.eventSpanFromLat = formData.eventSpanFromLat ? Number(formData.eventSpanFromLat) : null;
        eventData.eventSpanFromLng = formData.eventSpanFromLng ? Number(formData.eventSpanFromLng) : null;
        eventData.eventSpanFromZoom = formData.eventSpanFromZoom ? Number(formData.eventSpanFromZoom) : null;

        eventData.eventSpanToDate = normalizeDateInput(formData.eventSpanToDate || resolvedDT.date);
        eventData.eventSpanToTime = formData.eventSpanToTime || resolvedDT.time;
        eventData.eventSpanToLocation = formData.eventSpanToLocation || "";
        eventData.eventSpanToLat = formData.eventSpanToLat ? Number(formData.eventSpanToLat) : null;
        eventData.eventSpanToLng = formData.eventSpanToLng ? Number(formData.eventSpanToLng) : null;
        eventData.eventSpanToZoom = formData.eventSpanToZoom ? Number(formData.eventSpanToZoom) : null;
    } else {
        eventData.date = resolvedDT.date;
        eventData.time = resolvedDT.time;
    }

    // Level event location (departure for non-span events)
    eventData.eventLocation = formData.eventLocation || "";
    eventData.lat = formData.eventLat ? Number(formData.eventLat) : null;
    eventData.lng = formData.eventLng ? Number(formData.eventLng) : null;
    eventData.zoom = formData.eventZoom ? Number(formData.eventZoom) : null;

    return eventData;
}
