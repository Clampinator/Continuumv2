
import { NodeGenerator } from '../../factory/node-generator.js';
import { parseDate } from '../../../span-graph-utils/provide-span-graph-utils.js';

/*
Maps a normal event into a standardized graph node forced onto the diagonal.
*/
export function processLevelEvent(event, objectiveOffset) {
    // Derive age from the event's objective date and the current rail offset.
    // Stored event.age is a stale cache and is NOT authoritative for positioning.
    // This ensures level events always land at the correct diagonal position
    // regardless of what was previously written to event.age.
    let age;
    if (event.date) {
        const dateObj = parseDate(`${event.date}T${event.time || '12:00:00'}`);
        if (dateObj) age = Math.max(0, (dateObj.getTime() - objectiveOffset) / 1000);
    }
    if (!Number.isFinite(age)) age = Math.max(0, Number(event.age) || 0);

    // THE DIAGONAL AUTHORITY: 1s subjective age = 1000ms objective time on the current rail.
    const time = objectiveOffset + (age * 1000);

    const goalIds = (event.linkedGoalIds || []).concat(event.linkedGoalId ? [event.linkedGoalId] : []);
    const uniqueGoalIds = [...new Set(goalIds)];

    if (event.isRest || event.isRestEnd) {
        console.log("Continuum | processLevelEvent Rest Node:", {
            id: event.id,
            isRest: event.isRest,
            isRestEnd: event.isRestEnd
        });
    }

    return NodeGenerator.createNode({
        age: age,
        time: time,
        type: 'level',
        outgoingType: 'level',
        eventId: event.id,
        eraId: event.eraId,
        expId: event.expId,
        eraSort: event.eraSort,
        expSort: event.expSort,
        sort: event.sort,
        eventTitle: event.title || "Event", 
        linkedGoalIds: uniqueGoalIds,
        isRestStart: !!event.isRest,
        isRestEnd: !!event.isRestEnd,
        lat: event.lat,
        lng: event.lng,
        zoom: event.zoom
    });
}
