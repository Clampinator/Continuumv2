import { convertTimestampToDateString, formatSubjectiveAge, formatDuration, parseDate } from '/systems/continuum-v2/modules/span-graph-utils/provide-span-graph-utils.js';
import { buildContextOptions } from '../build-context-options.js';
import { ContextFinder } from '../../context-finder.js';

/**
 * TEMPLATE DATA PROVIDER
 * ADI REBUILT: Separates Facts (record) from Physics (x/y).
 */
export function getTemplateData(actor, params) {
    const { mode, existingData, viewState, graphData } = params;
    
    let age = 0;
    let ts = null; 
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

    // 1. DATA EXTRACTION
    if (mode === 'edit' && existingData) {
        const node = existingData;
        const record = node.record || node; 
        
        age = node.x !== undefined ? node.x : node.age;
        ts = node.y !== undefined ? node.y : (node.ts || node.time);
        
        isSpan = !!record.isSpan;
        title = record.title || "";
        notes = record.notes || record.description || "";
        isRest = !!record.isRest;
        eraId = node.eraId || record.eraId;
        expId = node.expId || record.expId;

        if (isSpan) {
            spanFromDate = record.spanFromDate;
            spanFromTime = record.spanFromTime;
            spanFromLocation = record.spanFromLocation;
            spanFromLat = record.spanFromLat;
            spanFromLng = record.spanFromLng;
            spanFromZoom = record.spanFromZoom;

            spanToDate = record.spanToDate;
            spanToTime = record.spanToTime;
            spanToLocation = record.spanToLocation;
            spanToLat = record.spanToLat;
            spanToLng = record.spanToLng;
            spanToZoom = record.spanToZoom;
        } else {
            location = record.location || "";
            lat = record.lat;
            lng = record.lng;
            zoom = record.zoom;
        }
    } else if (mode === 'log') {
        age = (params.ageRaw !== undefined) ? params.ageRaw : graphData.nowNode.x;
        ts = (params.timeRaw !== undefined) ? params.timeRaw : graphData.nowNode.y;

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
        const precedingNode = graphData.nodes.find(n => n.id === precedingId);
        eraId = precedingNode?.eraId;
        expId = precedingNode?.expId;

        if (!eraId && age !== undefined) {
            const hit = ContextFinder.getHitContext(age, graphData);
            eraId = hit?.eraId;
        }

        title = "Inserted Event";
    }

    if (ts === null || ts === undefined || isNaN(ts)) {
        const dobStr = actor.system.personal?.dob || "";
        const dobDate = parseDate(dobStr);
        ts = dobDate ? dobDate.getTime() : 0; 
    }

    const dt = convertTimestampToDateString(ts);

    return {
        mode,
        isLogMode: mode === 'log',
        title,
        notes,
        date: (mode === 'edit' && !isSpan && existingData?.record) ? existingData.record.date : dt.date,
        time: (mode === 'edit' && !isSpan && existingData?.record) ? existingData.record.time : dt.time,
        location,
        lat,
        lng,
        zoom,
        spanFromDate: spanFromDate || dt.date,
        spanFromTime: spanFromTime || dt.time,
        spanFromLocation,
        spanFromLat,
        spanFromLng,
        spanFromZoom,
        spanToDate: spanToDate || dt.date,
        spanToTime: spanToTime || dt.time,
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
        canSeeSpan: (actor.system.spanning?.span || 0) >= 1
    };
}
