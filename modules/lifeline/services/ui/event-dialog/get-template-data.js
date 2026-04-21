import { convertTimestampToDateString, formatSubjectiveAge, formatDuration, parseDate } from '../../../../span-graph-utils/provide-span-graph-utils.js';
import { buildContextOptions } from '../build-context-options.js';
import { ContextFinder } from '../../context-finder.js';

export function getTemplateData(actor, params) {
    const { mode, existingData, viewState, graphData } = params;
    
    let age = 0;
    let ts = Date.now();
    let title = "";
    let notes = "";
    let isRest = false;
    let isSpan = false;
    let eraId = null;
    let expId = null;
    let location = "";
    let lat = null;
    let lng = null;
    let zoom = null;

    let spanFromDate = "";
    let spanFromTime = "";
    let spanFromLocation = "";
    let spanFromLat = null;
    let spanFromLng = null;
    let spanFromZoom = null;

    let spanToDate = "";
    let spanToTime = "";
    let spanToLocation = "";
    let spanToLat = null;
    let spanToLng = null;
    let spanToZoom = null;

    let ageDeltaFormatted = "";
    let timeDeltaFormatted = "";

    if (mode === 'edit') {
        age = existingData.age;
        isSpan = !!existingData.isSpan;
        
        if (isSpan) {
            spanFromDate = existingData.spanFromDate;
            spanFromTime = existingData.spanFromTime;
            spanFromLocation = existingData.spanFromLocation;
            spanFromLat = existingData.spanFromLat;
            spanFromLng = existingData.spanFromLng;
            spanFromZoom = existingData.spanFromZoom;

            spanToDate = existingData.spanToDate;
            spanToTime = existingData.spanToTime;
            spanToLocation = existingData.spanToLocation;
            spanToLat = existingData.spanToLat;
            spanToLng = existingData.spanToLng;
            spanToZoom = existingData.spanToZoom;

            const toDateObj = parseDate(`${spanToDate}T${spanToTime || '12:00:00'}`);
            ts = toDateObj ? toDateObj.getTime() : Date.now();
        } else {
            const dateObj = parseDate(`${existingData.date}T${existingData.time || '12:00:00'}`);
            ts = dateObj ? dateObj.getTime() : Date.now();
            location = existingData.location || "";
            lat = existingData.lat;
            lng = existingData.lng;
            zoom = existingData.zoom;
        }
        
        title = existingData.title;
        notes = existingData.notes || existingData.description || "";
        isRest = !!existingData.isRest;
        eraId = existingData.eraId;
        expId = existingData.expId;
    } else if (mode === 'log') {
        // AUTHORITY: Prefer the raw coordinates passed from the drop handler to prevent
        // regressions if the graph re-renders while the dialog is opening.
        age = (params.ageRaw !== undefined) ? params.ageRaw : graphData.nowNode.age;
        ts = (params.timeRaw !== undefined) ? params.timeRaw : graphData.nowNode.time;

        isSpan = viewState.activeDragType === 'span';
        title = isSpan ? "Span" : "Event";
        const startWorld = viewState.dragStartWorld || { eraId: null, expId: null, time: ts, age };
        eraId = startWorld.eraId;
        expId = startWorld.expId;

        const timeDiff = (ts - startWorld.time) / 1000;
        timeDeltaFormatted = formatDuration(timeDiff);
        ageDeltaFormatted = formatDuration(age - startWorld.age);

        if (isSpan) {
            const fromDT = convertTimestampToDateString(viewState.dragStartWorld.time);
            spanFromDate = fromDT.date;
            spanFromTime = fromDT.time;
            spanFromLocation = viewState.dragStartWorld.eventTitle || "";
            spanFromLat = viewState.dragStartWorld.lat;
            spanFromLng = viewState.dragStartWorld.lng;
            spanFromZoom = viewState.dragStartWorld.zoom;

            const toDT = convertTimestampToDateString(ts);
            spanToDate = toDT.date;
            spanToTime = toDT.time;
            spanToLocation = ""; 
        }
    } else if (mode === 'insert') {
        age = (params.ageRaw !== undefined) ? params.ageRaw : viewState.hoveredSegment?.worldAge;
        ts = (params.timeRaw !== undefined) ? params.timeRaw : viewState.hoveredSegment?.worldTime;
        
        const precedingId = params.precedingEventId || viewState.hoveredSegment?.precedingEventId;
        const precedingNode = graphData.levelNodes.find(n => n.eventId === precedingId);
        eraId = precedingNode?.eraId;
        expId = precedingNode?.expId;

        if (!eraId && age !== undefined) {
            const hit = ContextFinder.getHitContext(age, graphData);
            eraId = hit?.eraId;
        }

        title = "Inserted Event";
    }

    const dt = convertTimestampToDateString(ts);

    // Ensure span defaults are populated even if not currently a span
    if (!spanFromDate) spanFromDate = dt.date;
    if (!spanFromTime) spanFromTime = dt.time;
    if (!spanToDate) spanToDate = dt.date;
    if (!spanToTime) spanToTime = dt.time;

    return {
        mode,
        isLogMode: mode === 'log',
        title,
        notes,
        date: dt.date,
        time: dt.time,
        location,
        lat,
        lng,
        zoom,
        spanFromDate,
        spanFromTime,
        spanFromLocation,
        spanFromLat,
        spanFromLng,
        spanFromZoom,
        spanToDate,
        spanToTime,
        spanToLocation,
        spanToLat,
        spanToLng,
        spanToZoom,
        ageFormatted: formatSubjectiveAge(age),
        ageDeltaFormatted,
        timeDeltaFormatted,
        isRest,
        isSpan,
        defaultNewExpName: isSpan ? "Parallel Project" : "New Experience",
        contextOptions: buildContextOptions(actor, eraId, expId),
        eraId,
        expId,
        ageRaw: age,
        timeRaw: ts,
        canSeeSpan: actor.getFlag('continuum-v2', 'playersCanSeeSpan') ?? false
    };
}
