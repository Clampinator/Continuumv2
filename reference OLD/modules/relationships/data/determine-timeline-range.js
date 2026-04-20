/**
 * Determines the date range for the relationship map scrubber.
 * Starts from the character's date of birth, then expands to cover
 * any dateFrom/dateTo values set on individual relationship edges.
 * A saved timeline flag is respected but never shrinks below the edge range.
 * @param {Actor} actor
 * @returns {object} { minTime, maxTime }
 */
export function determineTimelineRange(actor) {
    const inceptionStr = actor.system.personal?.dob;
    const inceptionTime = inceptionStr ? new Date(inceptionStr).getTime() : new Date("1900-01-01").getTime();
    const nowTime = Date.now();

    let minTime = inceptionTime;
    let maxTime = nowTime + 31536000000; // +1 year buffer

    // Expand range to cover every dated edge and node
    const expandRange = (dateStr, isEnd = false) => {
        if (!dateStr) return;
        const t = new Date(dateStr).getTime();
        if (isNaN(t)) return;
        if (isEnd) maxTime = Math.max(maxTime, t + 31536000000); // buffer past end
        else       minTime = Math.min(minTime, t);
    };

    for (const e of Object.values(actor.system.networkEdges || {})) {
        expandRange(e.dateFrom);
        expandRange(e.dateTo, true);
    }
    for (const n of Object.values(actor.system.network || {})) {
        expandRange(n.dateFrom);
        expandRange(n.dateTo, true);
    }

    // Saved flag is honoured but expanded (never shrunken) to cover edge dates
    const savedTimeline = actor.getFlag('continuum', 'relMapTimeline');
    if (savedTimeline?.start && savedTimeline?.end) {
        minTime = Math.min(savedTimeline.start, minTime);
        maxTime = Math.max(savedTimeline.end, maxTime);
    }

    return { minTime, maxTime };
}
