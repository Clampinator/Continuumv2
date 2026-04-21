/*
Transforms raw Actor events into "Graph Node" objects.
This is the only place where Actor data structure knowledge lives.
*/
export const NodeGenerator = {
    createNode(config) {
        return {
            age: config.age || 0,
            time: config.time || 0,
            type: config.type || 'level',
            outgoingType: config.outgoingType || 'level',
            eventId: config.eventId || null,
            eraId: config.eraId || null,
            expId: config.expId || null,
            // SUBJECTIVE SORT PROPERTIES
            eraSort: config.eraSort || 0,
            expSort: config.expSort || 0,
            sort: config.sort || 0,
            eventTitle: config.eventTitle || "Node",
            eventNotes: config.eventNotes || "",
            linkedGoalIds: config.linkedGoalIds || [],
            isRestStart: !!config.isRestStart,
            isYetFulfillment: !!config.isYetFulfillment,
            lat: (config.lat !== null && config.lat !== undefined && config.lat !== '') ? config.lat : null,
            lng: (config.lng !== null && config.lng !== undefined && config.lng !== '') ? config.lng : null,
            zoom: config.zoom || 12
        };
    }
};
