/*
Extracts located events from an actor's lifeline, sorted by objective date.
Returns { waypoints, segments } for drawing on the SpaceTime map.

Waypoint: { ms, lat, lng, title, subjectiveAge }
Segment:  { fromMs, toMs, fromLat, fromLng, toLat, toLng, type }
  type: 'solid' | 'dashed' | 'dotted'
*/

function parseDateToMs(date, time) {
    if (!date) return null;
    const t = time || '00:00:00';
    const ms = new Date(`${date}T${t}`).getTime();
    return isNaN(ms) ? null : ms;
}

function collectAllEvents(actor) {
    const list = [];
    for (const era of Object.values(actor.system.eras || {})) {
        for (const ev of Object.values(era.events || {})) list.push(ev);
        for (const exp of Object.values(era.experiences || {})) {
            for (const ev of Object.values(exp.events || {})) list.push(ev);
        }
    }
    return list;
}

function buildWaypoints(events) {
    const points = [];
    for (const ev of events) {
        if (ev.isSpan) {
            const fromMs = parseDateToMs(ev.spanFromDate, ev.spanFromTime);
            const toMs   = parseDateToMs(ev.spanToDate,   ev.spanToTime);
            if (fromMs !== null && ev.spanFromLat != null && ev.spanFromLng != null) {
                points.push({
                    ms: fromMs, lat: ev.spanFromLat, lng: ev.spanFromLng,
                    title: ev.title, subjectiveAge: ev.age,
                    spanId: ev.id, spanRole: 'from'
                });
            }
            if (toMs !== null && ev.spanToLat != null && ev.spanToLng != null) {
                points.push({
                    ms: toMs, lat: ev.spanToLat, lng: ev.spanToLng,
                    title: ev.title, subjectiveAge: ev.age,
                    spanId: ev.id, spanRole: 'to'
                });
            }
        } else {
            const ms = parseDateToMs(ev.date, ev.time);
            if (ms !== null && ev.lat != null && ev.lng != null) {
                points.push({
                    ms, lat: ev.lat, lng: ev.lng,
                    title: ev.title, subjectiveAge: ev.age,
                    spanId: null, spanRole: null
                });
            }
        }
    }
    return points;
}

/*
Determine segment type between consecutive waypoints.
- dashed: both waypoints belong to the same span event (from -> to)
- dotted: an unlocated event falls between the two waypoints
- solid:  otherwise
*/
function buildSegments(waypoints, allEvents) {
    if (waypoints.length < 2) return [];

    // Collect ms values of events that lack location data
    const unlocatedTimes = [];
    for (const ev of allEvents) {
        if (ev.isSpan) {
            const fMs = parseDateToMs(ev.spanFromDate, ev.spanFromTime);
            const tMs = parseDateToMs(ev.spanToDate,   ev.spanToTime);
            if (fMs !== null && (ev.spanFromLat == null || ev.spanFromLng == null)) unlocatedTimes.push(fMs);
            if (tMs !== null && (ev.spanToLat   == null || ev.spanToLng   == null)) unlocatedTimes.push(tMs);
        } else {
            const ms = parseDateToMs(ev.date, ev.time);
            if (ms !== null && (ev.lat == null || ev.lng == null)) unlocatedTimes.push(ms);
        }
    }

    const segments = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
        const a = waypoints[i];
        const b = waypoints[i + 1];
        const isSpanSegment = a.spanId && a.spanId === b.spanId
            && a.spanRole === 'from' && b.spanRole === 'to';
        const hasGap = !isSpanSegment
            && unlocatedTimes.some(ms => ms > a.ms && ms < b.ms);
        const type = isSpanSegment ? 'dashed' : hasGap ? 'dotted' : 'solid';
        segments.push({
            fromMs: a.ms, toMs: b.ms,
            fromLat: a.lat, fromLng: a.lng,
            toLat: b.lat, toLng: b.lng,
            type
        });
    }
    return segments;
}

export function getLifelineEvents(actor) {
    const allEvents = collectAllEvents(actor);
    const waypoints = buildWaypoints(allEvents);
    waypoints.sort((a, b) => a.ms - b.ms);
    const segments = buildSegments(waypoints, allEvents);
    return { waypoints, segments };
}
