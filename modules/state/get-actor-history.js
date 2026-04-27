/**
 * STATE: GET ACTOR HISTORY
 * Maps the nested actor era/experience/event structure into a flat, 
 * authoritative array of raw facts for the Temporal Engine.
 * 
 * ENFORCES: Pure Fact Reporting (No physical coordinates).
 * 
 * @param {Actor} actor - The Foundry Actor instance.
 * @returns {Array} A flat array of { id, sort, record, path }
 */
export function getActorHistory(actor) {
    const history = [];
    const eras = actor.system.eras || {};

    for (const [eraId, era] of Object.entries(eras)) {
        // Era-level events
        for (const [eventId, event] of Object.entries(era.events || {})) {
            history.push(mapToFact(eventId, event, `system.eras.${eraId}.events.${eventId}`));
        }

        // Experience-level events
        for (const [expId, exp] of Object.entries(era.experiences || {})) {
            for (const [eventId, event] of Object.entries(exp.events || {})) {
                history.push(mapToFact(eventId, event, `system.eras.${eraId}.experiences.${expId}.events.${eventId}`));
            }
        }
    }

    // Include the "Now" fact
    history.push({
        id: 'now',
        sort: 999999999, // Now is always narratives end
        isNow: true,
        record: {
            eventTitle: "NOW",
            eventIsSpan: false,
            eventIsRest: false,
            objectiveNow: actor.system.personal?.objectiveNow
        },
        path: 'system.personal'
    });

    // AUTHORITY: Narrative 'sort' is the primary order for Facts.
    // If sort is identical, use ID.
    // Physics coordinates (x, y) are NO LONGER calculated here.
    return history.sort((a, b) => {
        if (a.sort !== b.sort) return a.sort - b.sort;
        return a.id.localeCompare(b.id);
    });
}

/**
 * Maps a raw event record to a Fact Node.
 * @private
 */
function mapToFact(id, event, path) {
    const eventIsSpan = Boolean(event.eventIsSpan);
    const fact = {
        eventTitle: event.eventTitle || "",
        eventAge: event.eventAge || 0,
        eventDate: event.eventDate || "",
        eventTime: event.eventTime || "12:00:00",
        eventLocation: event.eventLocation || "",
        eventIsSpan,
        eventIsRest: Boolean(event.eventIsRest),
        // AUTHORITY: Preserve raw timestamps from database to prevent re-parsing drift.
        ts: event.ts,
        arrivalTs: event.arrivalTs
    };

    if (eventIsSpan) {
        fact.eventSpanFromDate = event.eventSpanFromDate || fact.eventDate;
        fact.eventSpanFromTime = event.eventSpanFromTime || fact.eventTime;
        fact.eventSpanToDate = event.eventSpanToDate || fact.eventDate;
        fact.eventSpanToTime = event.eventSpanToTime || fact.eventTime;
    }

    return {
        id,
        sort: Number(event.sort) || 0,
        path,
        record: fact // Standardized Fact Layer
    };
}
