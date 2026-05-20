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
        eventNotes: event.eventNotes || event.description || "",
        eventAge: (event.eventAge !== undefined && event.eventAge !== null) ? Number(event.eventAge) : null,
        eventDate: event.eventDate || "",
        eventTime: event.eventTime || "12:00:00",
        eventLocation: event.eventLocation || "",
        eventIsSpan,
        // Passed through as-is: Kernel (establish-history-physics) applies
        // semantic classification (!eventIsRest && !eventIsSpan).
        eventIsRest: event.eventIsRest,
        isRestEnd: event.isRestEnd,
        // Experience linkage - needed so generateExperiences can anchor
        // box corners to the event nodes that open/close each Experience.
        startsExpId: event.startsExpId || null,
        endsExpId: event.endsExpId || null,
        isExpStart: Boolean(event.isExpStart || event._isExpStart),
        isExpEnd: Boolean(event.isExpEnd || event._isExpEnd),
        // Span facts: always populated with departure fallback so the
        // Kernel and TTL don't have to re-derive them. For level events,
        // the departure fields mirror the level fields. The Kernel routes
        // to the correct fields based on eventIsSpan.
        eventSpanFromDate: event.eventSpanFromDate || event.eventDate || "",
        eventSpanFromTime: event.eventSpanFromTime || event.eventTime || "",
        eventSpanToDate: event.eventSpanToDate || event.eventDate || "",
        eventSpanToTime: event.eventSpanToTime || event.eventTime || "",
        eventSpanFromLocation: event.eventSpanFromLocation || event.eventLocation || "",
        eventSpanToLocation: event.eventSpanToLocation || "",
        // AUTHORITY: Preserve raw timestamps from database to prevent re-parsing drift.
        ts: event.ts,
        arrivalTs: event.arrivalTs,
        // PULLED SPAN: When true, another spanner carried this character
        // through time. The span exists on the timeline but costs no pool.
        // Only meaningful when eventIsSpan is true.
        isPulled: Boolean(event.isPulled),
        // GOAL LINKAGE: Carries goal IDs linked to this event so the
        // Projector can draw dotted connection lines on hover.
        linkedGoalIds: (event.linkedGoalIds || []).concat(event.linkedGoalId ? [event.linkedGoalId] : []),
        // LOCATION INHERITANCE: Whether the location was auto-filled from
        // the most recent upstream location (true) or manually set by the
        // user (false). Default true for backward compat: events created
        // before this feature are treated as inherited and eligible for
        // cascade updates. Three flags for independent cascade control.
        locationInherited: event.locationInherited !== false,
        spanFromLocationInherited: event.spanFromLocationInherited !== false,
        spanToLocationInherited: event.spanToLocationInherited !== false,
        // Geo coordinates passed through for location auto-fill and cascade
        lat: event.lat ?? null,
        lng: event.lng ?? null,
        zoom: event.zoom ?? null,
        eventSpanFromLat: event.eventSpanFromLat ?? null,
        eventSpanFromLng: event.eventSpanFromLng ?? null,
        eventSpanFromZoom: event.eventSpanFromZoom ?? null,
        eventSpanToLat: event.eventSpanToLat ?? null,
        eventSpanToLng: event.eventSpanToLng ?? null,
        eventSpanToZoom: event.eventSpanToZoom ?? null
    };

    return {
        id,
        sort: Number(event.sort) || 0,
        eraId: eraId || null,
        expId: expId || null,
        path,
        record: fact // Standardized Fact Layer
    };
}
