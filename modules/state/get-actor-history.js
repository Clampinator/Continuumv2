/**
 * STATE: GET ACTOR HISTORY
 * Maps the nested actor era/experience/event structure into a flat, 
 * authoritative array of physical nodes for the Span Graph.
 * 
 * ENFORCES: Subjective Age Authority for sorting.
 * 
 * @param {Actor} actor - The Foundry Actor instance.
 * @returns {Array} A flat array of { id, x, y, arrivalY, sort, record, path }
 */
export function getActorHistory(actor) {
    const history = [];
    const eras = actor.system.eras || {};
    const dobStr = actor.system.personal?.dob || "1970-01-01";
    const dobTime = new Date(`${dobStr}T12:00:00`).getTime();

    for (const [eraId, era] of Object.entries(eras)) {
        // Era-level events
        for (const [eventId, event] of Object.entries(era.events || {})) {
            history.push(mapToNode(eventId, event, `system.eras.${eraId}.events.${eventId}`, dobTime));
        }

        // Experience-level events
        for (const [expId, exp] of Object.entries(era.experiences || {})) {
            for (const [eventId, event] of Object.entries(exp.events || {})) {
                history.push(mapToNode(eventId, event, `system.eras.${eraId}.experiences.${expId}.events.${eventId}`, dobTime));
            }
        }
    }

    // Include the "Now" node
    const subNow = Number(actor.system.personal?.subjectiveNow) || 0;
    const objNow = Number(actor.system.personal?.objectiveNow) || dobTime;
    
    history.push({
        id: 'now',
        x: subNow,
        y: objNow,
        arrivalY: 0,
        sort: 999999999, // Now is always narratives end
        isNow: true,
        record: {
            title: "NOW",
            isSpan: false,
            isRest: false
        },
        path: 'system.personal'
    });

    // AUTHORITY: Subjective Age is the primary sort.
    // Use Narrative 'sort' as the tie-breaker for Spans (where Age is identical).
    // Objective Time (y) is NO LONGER used for sorting to prevent Down-Span flips.
    return history.sort((a, b) => {
        if (a.x !== b.x) return a.x - b.x;
        return (a.sort || 0) - (b.sort || 0);
    });
}

/**
 * Maps a raw event record to a Physics Node.
 * @private
 */
function mapToNode(id, event, path, dobTime) {
    const isSpan = Boolean(event.isSpan);
    const dateStr = isSpan ? (event.spanFromDate || event.date) : event.date;
    const timeStr = isSpan ? (event.spanFromTime || event.time) : event.time;
    
    const timestamp = dateStr ? new Date(`${dateStr}T${timeStr || '12:00:00'}`).getTime() : dobTime;

    let arrivalY = 0;
    if (isSpan) {
        if (event.arrivalTs !== undefined && event.arrivalTs !== null) {
            arrivalY = Number(event.arrivalTs);
        } else {
            const arrDate = event.spanToDate || event.date;
            const arrTime = event.spanToTime || event.time || '12:00:00';
            arrivalY = arrDate ? new Date(`${arrDate}T${arrTime}`).getTime() : timestamp;
        }
    }

    return {
        id,
        x: Number(event.age) || 0, // Physics X: Subjective Age
        y: timestamp,
        arrivalY: arrivalY,
        sort: Number(event.sort) || 0,
        path,
        record: { ...event, isSpan } // Fact Layer
    };
}
