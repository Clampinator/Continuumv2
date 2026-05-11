import { NodeGenerator } from '../../factory/node-generator.js';
import { resolveSpanEventCoordinates } from '/systems/continuum-v2/modules/temporal-kernel/resolve-event-coordinates.js';

/*
DEPRECATED: This module is being replaced by the temporal-engine pipeline
(get-temporal-state.js). Do not add new features here. Port existing
callers to the engine pipeline.

The coordinate resolution logic has been extracted to
modules/temporal-kernel/resolve-event-coordinates.js.
This file is now a thin wrapper that calls the Kernel function
and wraps the results in NodeGenerator nodes.

Maps a Span event into a vertical discontinuity (Origin -> Destination).
*/
export function processSpanEvent(event, currentOffset) {
    const { departureAge, departureTime, arrivalTime, newOffset } =
        resolveSpanEventCoordinates(event, currentOffset);

    const goalIds = (event.linkedGoalIds || []).concat(event.linkedGoalId ? [event.linkedGoalId] : []);
    const uniqueGoalIds = [...new Set(goalIds)];

    // Origin Node (The point of departure)
    const originNode = NodeGenerator.createNode({
        age: departureAge,
        time: departureTime,
        type: 'span-origin',
        outgoingType: 'span',
        eventId: event.id, eraId: event.eraId, expId: event.expId,
        eraSort: event.eraSort, expSort: event.expSort, sort: event.sort,
        eventTitle: event.eventTitle || "Span Start",
        linkedGoalIds: uniqueGoalIds,
        lat: event.eventSpanFromLat,
        lng: event.eventSpanFromLng,
        zoom: event.eventSpanFromZoom
    });

    // Destination Node (The point of arrival)
    // Note: Same Age (X), but different Time (Y)
    const destNode = NodeGenerator.createNode({
        age: departureAge,
        time: arrivalTime,
        type: 'span-dest',
        outgoingType: 'level',
        eventId: event.id, eraId: event.eraId, expId: event.expId,
        eraSort: event.eraSort, expSort: event.expSort, sort: event.sort + 1,
        eventTitle: "Span Arrival",
        linkedGoalIds: uniqueGoalIds,
        lat: event.eventSpanToLat,
        lng: event.eventSpanToLng,
        zoom: event.eventSpanToZoom
    });

    return {
        nodes: [originNode, destNode],
        newOffset: newOffset
    };
}