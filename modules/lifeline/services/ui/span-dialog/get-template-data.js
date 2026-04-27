import { convertTimestampToDateString, formatSubjectiveAge, formatDuration, parseDate, normalizeDateInput } from '../../../../span-graph-utils/provide-span-graph-utils.js';
import { buildContextOptions } from './build-context-options.js';
import { ContextFinder } from '../../context-finder.js';

/**
 * REBUILT: Exact replica of legacy get-template-data.js logic.
 */
export function getTemplateData(actor, params) {
    const { mode, existingData, viewState, graphData } = params;
    
    let age = 0;
    let ts = Date.now();
    let eventTitle = "";
    let eventNotes = "";
    let eventIsRest = false;
    let eventIsSpan = false;
    let eraId = null;
    let expId = null;
    let location = "";
    let lat = null;
    let lng = null;
    let zoom = null;

    let eventSpanFromDate = "";
    let eventSpanFromTime = "";
    let eventSpanFromLocation = "";
    let eventSpanFromLat = null;
    let eventSpanFromLng = null;
    let eventSpanFromZoom = null;

    let eventSpanToDate = "";
    let eventSpanToTime = "";
    let eventSpanToLocation = "";
    let eventSpanToLat = null;
    let eventSpanToLng = null;
    let eventSpanToZoom = null;

    let ageDeltaFormatted = "";
    let timeDeltaFormatted = "";

    if (mode === 'edit') {
        age = existingData.eventAge;
        eventIsSpan = !!existingData.eventIsSpan;
        
        if (eventIsSpan) {
            eventSpanFromDate = existingData.eventSpanFromDate;
            eventSpanFromTime = existingData.eventSpanFromTime;
            eventSpanFromLocation = existingData.eventSpanFromLocation;
            eventSpanFromLat = existingData.eventSpanFromLat;
            eventSpanFromLng = existingData.eventSpanFromLng;
            eventSpanFromZoom = existingData.eventSpanFromZoom;

            eventSpanToDate = existingData.eventSpanToDate;
            eventSpanToTime = existingData.eventSpanToTime;
            eventSpanToLocation = existingData.eventSpanToLocation;
            eventSpanToLat = existingData.eventSpanToLat;
            eventSpanToLng = existingData.eventSpanToLng;
            eventSpanToZoom = existingData.eventSpanToZoom;

            const toDateObj = parseDate(`${eventSpanToDate}T${eventSpanToTime || '12:00:00'}`);
            ts = toDateObj ? toDateObj.getTime() : Date.now();
        } else {
            const dateObj = parseDate(`${existingData.eventDate}T${existingData.eventTime || '12:00:00'}`);
            ts = dateObj ? dateObj.getTime() : Date.now();
            location = existingData.eventLocation || "";
            lat = existingData.lat;
            lng = existingData.lng;
            zoom = existingData.zoom;
        }
        
        eventTitle = existingData.eventTitle;
        eventNotes = existingData.eventNotes || existingData.description || "";
        eventIsRest = !!existingData.eventIsRest;
        eraId = existingData.eraId;
        expId = existingData.expId;
    } else if (mode === 'log') {
        age = (params.ageRaw !== undefined) ? params.ageRaw : (graphData.nowNode.eventAge || graphData.nowNode.age);
        ts = (params.timeRaw !== undefined) ? params.timeRaw : (graphData.nowNode.eventTime || graphData.nowNode.time);

        // Interaction check: is this a span jump?
        eventIsSpan = params.eventIsSpan || (viewState && viewState.activeDragType === 'span');
        eventTitle = eventIsSpan ? "Span" : "Event";
        
        const startWorld = params.departure || (viewState ? viewState.dragStartWorld : { eventTime: ts, eventAge: age });
        eraId = startWorld.eraId || null;
        expId = startWorld.expId || null;

        const startAge = startWorld.eventAge !== undefined ? startWorld.eventAge : startWorld.age;
        const startTime = startWorld.eventTime !== undefined ? startWorld.eventTime : startWorld.time;

        const timeDiff = (ts - startTime) / 1000;
        timeDeltaFormatted = formatDuration(timeDiff);
        ageDeltaFormatted = formatDuration(age - startAge);

        if (eventIsSpan) {
            const fromDT = convertTimestampToDateString(startTime);
            eventSpanFromDate = fromDT.date;
            eventSpanFromTime = fromDT.time;
            eventSpanFromLocation = startWorld.eventTitle || "";
            eventSpanFromLat = startWorld.lat;
            eventSpanFromLng = startWorld.lng;
            eventSpanFromZoom = startWorld.zoom;

            const toDT = convertTimestampToDateString(ts);
            eventSpanToDate = toDT.date;
            eventSpanToTime = toDT.time;
            eventSpanToLocation = ""; 
        }
    }

    const dt = convertTimestampToDateString(ts);

    if (!eventSpanFromDate) eventSpanFromDate = dt.date;
    if (!eventSpanFromTime) eventSpanFromTime = dt.time;
    if (!eventSpanToDate) eventSpanToDate = dt.date;
    if (!eventSpanToTime) eventSpanToTime = dt.time;

    let canSeeSpan = true;
    try {
        canSeeSpan = actor.getFlag('continuum-v2', 'playersCanSeeSpan') ?? actor.getFlag('continuum', 'playersCanSeeSpan') ?? true;
    } catch (e) {
        console.warn("SpanGraph | getFlag failed:", e);
    }

    return {
        mode,
        isLogMode: mode === 'log',
        eventTitle,
        eventNotes,
        date: dt.date,
        time: dt.time,
        location,
        lat,
        lng,
        zoom,
        eventSpanFromDate,
        eventSpanFromTime,
        eventSpanFromLocation,
        eventSpanFromLat,
        eventSpanFromLng,
        eventSpanFromZoom,
        eventSpanToDate,
        eventSpanToTime,
        eventSpanToLocation,
        eventSpanToLat,
        eventSpanToLng,
        eventSpanToZoom,
        ageFormatted: formatSubjectiveAge(age),
        ageDeltaFormatted,
        timeDeltaFormatted,
        eventIsRest,
        eventIsSpan,
        defaultNewExpName: eventIsSpan ? "Parallel Project" : "New Experience",
        contextOptions: buildContextOptions(actor, eraId, expId),
        eraId,
        expId,
        ageRaw: age,
        timeRaw: ts,
        canSeeSpan
    };
}
