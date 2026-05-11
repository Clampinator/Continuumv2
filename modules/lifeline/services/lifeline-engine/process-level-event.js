import { NodeGenerator } from '../../factory/node-generator.js';
import { resolveLevelEventCoordinates } from '/systems/continuum-v2/modules/temporal-kernel/resolve-event-coordinates.js';

/*
DEPRECATED: This module is being replaced by the temporal-engine pipeline
(get-temporal-state.js). Do not add new features here. Port existing
callers to the engine pipeline.

The coordinate resolution logic has been extracted to
modules/temporal-kernel/resolve-event-coordinates.js.
This file is now a thin wrapper that calls the Kernel function
and wraps the result in a NodeGenerator node.

Maps a normal event into a standardized graph node forced onto the diagonal.
*/
export function processLevelEvent(event, objectiveOffset) {
    const { age, time } = resolveLevelEventCoordinates(event, objectiveOffset);

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