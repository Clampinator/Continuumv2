import { convertTimestampToDateString, formatSubjectiveAge, formatDuration, parseDate } from '/systems/continuum-v2/modules/span-graph-utils/provide-span-graph-utils.js';
import { buildContextOptions } from '../build-context-options.js';
import { ContextFinder } from '../../context-finder.js';

/**
 * TEMPLATE DATA PROVIDER
 * ADI REBUILT: Separates Facts (record) from Physics (x/y).
 */
export function getTemplateData(actor, params) {
    const { mode, existingData, graphData } = params;
    
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
    
    let timeDeltaFormatted = "";
    let ageDeltaFormatted = "";

    if (mode === 'edit' && existingData) {
        const record = existingData.record || existingData;
        age = (existingData.x !== undefined) ? existingData.x : record.age;
        ts = (existingData.y !== undefined) ? existingData.y : record.ts;
        title = record.title;
        notes = record.notes;
        isRest = record.isRest;
        isSpan = record.isSpan;
        eraId = existingData.eraId;
        expId = existingData.expId;

        if (isSpan) {
            spanFromDate = record.spanFromDate;
            spanFromTime = record.spanFromTime;
            spanFromLocation = record.spanFromLocation;
            spanFromLat = record.spanFromLat;
            spanFromLng = record.spanFromLng;
            spanFromZoom = record.spanFromZoom;
            
            spanToDate = record.spanToDate;
            spanToTime = record.spanToTime;
            location = record.spanToLocation || "";
            lat = record.spanToLat;
            lng = record.spanToLng;
            spanToZoom = record.spanToZoom;
        } else {
            location = record.location || "";
            lat = record.lat;
            lng = record.lng;
            zoom = record.zoom;
        }
    } else if (mode === 'log') {
        // ADI coordinates for NOW
        age = (params.ageRaw !== undefined) ? params.ageRaw : (graphData?.nowNode?.x || 0);
        ts = (params.timeRaw !== undefined) ? params.timeRaw : (graphData?.nowNode?.y || Date.now());

        isSpan = Boolean(params.isSpan);
        title = isSpan ? "Span" : "Event";
        
        // Start world from params (provided by PointerMachine) or fallback
        const startWorld = params.startWorld || { time: ts, age };
        eraId = params.eraId || null;
        expId = params.expId || null;

        const timeDiff = (ts - startWorld.time) / 1000;
        timeDeltaFormatted = formatDuration(timeDiff);
        ageDeltaFormatted = formatDuration(age - startWorld.age);

        if (isSpan) {
            const fromDT = convertTimestampToDateString(startWorld.time);
            spanFromDate = fromDT.date;
            spanFromTime = fromDT.time;
            spanFromLocation = startWorld.eventTitle || "";
            spanFromLat = startWorld.lat;
            spanFromLng = startWorld.lng;
            spanFromZoom = startWorld.zoom;

            const toDT = convertTimestampToDateString(ts);
            spanToDate = toDT.date;
            spanToTime = toDT.time;
        }
    } else if (mode === 'insert') {
        age = params.ageRaw || 0;
        ts = params.timeRaw || Date.now();
        title = "New Event";
        isSpan = Boolean(params.isSpan);

        const dt = convertTimestampToDateString(ts);
        if (isSpan) {
            spanFromDate = dt.date;
            spanFromTime = dt.time;
            spanToDate = dt.date;
            spanToTime = dt.time;
        }
    }

    // Resolved readable strings for display
    const dt = convertTimestampToDateString(ts || Date.now());
    const dateStr = dt.date;
    const timeStr = dt.time;

    // Context Options for dropdown
    const contextOptions = buildContextOptions(actor, eraId, expId);

    return {
        mode,
        id: existingData?.id || null,
        title,
        notes,
        age,
        ageFormatted: formatSubjectiveAge(age),
        date: dateStr,
        time: timeStr,
        isRest,
        isSpan,
        location,
        lat,
        lng,
        zoom,
        // Span specific
        spanFromDate,
        spanFromTime,
        spanFromLocation,
        spanFromLat,
        spanFromLng,
        spanFromZoom,
        spanToDate,
        spanToTime,
        timeDeltaFormatted,
        ageDeltaFormatted,
        // UI Helpers
        contextOptions,
        isEdit: mode === 'edit',
        isLog: mode === 'log',
        isInsert: mode === 'insert'
    };
}
