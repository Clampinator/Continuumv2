import { NodeGenerator } from '../../factory/node-generator.js';
import { parseDate } from '../../../span-graph-utils/provide-span-graph-utils.js';

/*
Maps a Span event into a vertical discontinuity (Origin -> Destination).
*/
export function processSpanEvent(event, currentOffset) {
    // 1. Calculate Origin (where the Spanner departed from)
    // Derive departure age from spanFromDate and the current rail offset.
    // Stored event.age is a stale cache and is NOT authoritative.
    let originTime;
    let age;
    if (event.spanFromDate) {
        const fromTimeStr = event.spanFromTime || '12:00:00';
        const fromDateObj = parseDate(`${event.spanFromDate}T${fromTimeStr}`);
        if (fromDateObj) {
            originTime = fromDateObj.getTime();
            age = Math.max(0, (originTime - currentOffset) / 1000);
        }
    }
    if (!Number.isFinite(age)) {
        age = Math.max(0, Number(event.age) || 0);
        originTime = currentOffset + (age * 1000);
    }
    
    // 2. Calculate Destination (where they landed)
    const destDateStr = event.spanToDate || event.date;
    const destTimeStr = event.spanToTime || event.time || '00:00:00';
    const destDateObj = parseDate(`${destDateStr}T${destTimeStr}`);
    const destTime = destDateObj ? destDateObj.getTime() : originTime;

    const goalIds = (event.linkedGoalIds || []).concat(event.linkedGoalId ? [event.linkedGoalId] : []);
    const uniqueGoalIds = [...new Set(goalIds)];

    // Origin Node (The point of departure)
    const originNode = NodeGenerator.createNode({
        age: age, 
        time: originTime,
        type: 'span-origin',
        outgoingType: 'span', 
        eventId: event.id, eraId: event.eraId, expId: event.expId,
        eraSort: event.eraSort, expSort: event.expSort, sort: event.sort,
        eventTitle: event.title || "Span Start",
        linkedGoalIds: uniqueGoalIds,
        lat: event.spanFromLat,
        lng: event.spanFromLng,
        zoom: event.spanFromZoom
    });

    // Destination Node (The point of arrival)
    // Note: Same Age (X), but different Time (Y)
    const destNode = NodeGenerator.createNode({
        age: age,
        time: destTime,
        type: 'span-dest',
        outgoingType: 'level',
        eventId: event.id, eraId: event.eraId, expId: event.expId,
        eraSort: event.eraSort, expSort: event.expSort, sort: event.sort + 1,
        eventTitle: "Span Arrival", 
        linkedGoalIds: uniqueGoalIds,
        lat: event.spanToLat,
        lng: event.spanToLng,
        zoom: event.spanToZoom
    });

    // Calculate new offset: NewTime = newOffset + (age * 1000)
    // => newOffset = NewTime - (age * 1000)
    const newOffset = destTime - (age * 1000);

    return {
        nodes: [originNode, destNode],
        newOffset: newOffset
    };
}
