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
            title: "NOW",
            isSpan: false,
            isRest: false,
            age: Number(actor.system.personal?.subjectiveNow) || 0,
            objectiveNow: actor.system.personal?.objectiveNow
        },
        path: 'system.personal'
    });

    // AUTHORITY: Narrative 'sort' is the primary order for Facts.
    // If sort is identical, use ID.
    // Physics coordinates (x, y) are NO LONGER calculated here.
    return history.sort((a, b) => {
        const ageA = Number(a.record.age) || 0;
        const ageB = Number(b.record.age) || 0;
        if (ageA !== ageB) return ageA - ageB;
        return (a.sort || 0) - (b.sort || 0);
    });
}

/**
 * Maps a raw event record to a Fact Node.
 * @private
 */
function mapToFact(id, event, path) {
    return {
        id,
        sort: Number(event.sort) || 0,
        path,
        record: { ...event, isSpan: Boolean(event.isSpan) } // Fact Layer
    };
}
