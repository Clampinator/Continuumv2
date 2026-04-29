
import { NodeGenerator } from '../../factory/node-generator.js';
import { parseDate } from '../../../span-graph-utils/provide-span-graph-utils.js';
import { projectSubjectiveAge, projectObjectiveTime } from '/systems/continuum-v2/modules/temporal-kernel/project-subjective-age.js';

/*
Maps a normal event into a standardized graph node forced onto the diagonal.
*/
export function processLevelEvent(event, objectiveOffset) {
    // Derive age from the event's objective date and the current rail offset.
    // Stored event.eventAge is a stale cache and is NOT authoritative for positioning.
    // This ensures level events always land at the correct diagonal position
    // regardless of what was previously written to event.eventAge.
    let age;
    if (event.eventDate) {
        const dateObj = parseDate(`${event.eventDate}T${event.eventTime || '12:00:00'}`);
        if (dateObj) age = projectSubjectiveAge(dateObj.getTime(), objectiveOffset);
    }
    if (!Number.isFinite(age)) age = Math.max(0, Number(event.eventAge) || 0);

    // THE DIAGONAL AUTHORITY: 1s subjective age = 1000ms objective time on the current rail.
    const time = projectObjectiveTime(age, objectiveOffset);

    const goalIds = (event.linkedGoalIds || []).concat(event.linkedGoalId ? [event.linkedGoalId] : []);
    const uniqueGoalIds = [...new Set(goalIds)];



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
        eventTitle: event.eventTitle || "Event", 
        linkedGoalIds: uniqueGoalIds,
        isRestStart: !!event.eventIsRest,
        isRestEnd: !!event.isRestEnd,
        lat: event.lat,
        lng: event.lng,
        zoom: event.zoom
    });
}
