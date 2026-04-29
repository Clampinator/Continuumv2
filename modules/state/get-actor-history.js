/**
 * STATE: GET ACTOR HISTORY
 * Maps the nested actor era/experience/event structure into a flat, 
 * authoritative array of raw facts for the Temporal Engine.
 * 
 * ENFORCES: Pure Fact Reporting (No physical coordinates).
 * PRESERVES: Experience linkage (expId, eraId, startsExpId, endsExpId, isExpStart, isExpEnd)
 * so box geometry can anchor Experience corners to their opener/closer Event nodes.
 * 
 * @param {Actor} actor - The Foundry Actor instance.
 * @returns {Array} A flat array of { id, sort, record, path, eraId, expId }
 */
export function getActorHistory(actor) {
    const history = [];
    const eras = actor.system.eras || {};

    for (const [eraId, era] of Object.entries(eras)) {
        // Era-level events (no experience affiliation)
        for (const [eventId, event] of Object.entries(era.events || {})) {
            history.push(mapToFact(eventId, event, `system.eras.${eraId}.events.${eventId}`, eraId, null));
        }

        // Experience-level events carry expId for box anchoring
        for (const [expId, exp] of Object.entries(era.experiences || {})) {
            for (const [eventId, event] of Object.entries(exp.events || {})) {
                history.push(mapToFact(eventId, event, `system.eras.${eraId}.experiences.${expId}.events.${eventId}`, eraId, expId));
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
 * Preserves experience linkage (expId, startsExpId, endsExpId, isExpStart, isExpEnd)
 * so that generateExperiences can anchor box corners to opener/closer nodes.
 * 
 * @param {string} id - Event ID
 * @param {Object} event - Raw event data from the actor
 * @param {string} path - Database path for this event
 * @param {string} eraId - Era ID this event belongs to
 * @param {string|null} expId - Experience ID if experience-level, null if era-level
 * @private
 */
function mapToFact(id, event, path, eraId, expId) {
    const eventIsSpan = Boolean(event.eventIsSpan);
    const fact = {
        eventTitle: event.eventTitle || "",
        eventAge: event.eventAge || 0,
        eventDate: event.eventDate || "",
        eventTime: event.eventTime || "12:00:00",
        eventLocation: event.eventLocation || "",
        eventIsSpan,
        eventIsRest: Boolean(event.eventIsRest),
        // Experience linkage - needed so generateExperiences can anchor
        // box corners to the event nodes that open/close each Experience.
        startsExpId: event.startsExpId || null,
        endsExpId: event.endsExpId || null,
        isExpStart: Boolean(event.isExpStart || event._isExpStart),
        isExpEnd: Boolean(event.isExpEnd || event._isExpEnd),
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
        eraId: eraId || null,
        expId: expId || null,
        path,
        record: fact // Standardized Fact Layer
    };
}
