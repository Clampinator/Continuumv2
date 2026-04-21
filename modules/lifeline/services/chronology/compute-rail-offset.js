import { ReferenceResolver } from '../reference-resolver.js';
import { parseDate } from '../../../span-graph-utils/provide-span-graph-utils.js';

/*
Pure function: returns the accumulated objective-time base at the given subjective
age. No graphData dependency - derived entirely from actor.system.eras.

Each span event contributes (spanToTs - spanFromTs) to the objective displacement.
Spans are included only if their stored age field <= targetAge.

Return value: an objective timestamp representing the "rail origin" at targetAge.
  - No spans: returns dobTs
  - After N spans: returns dobTs + sum(toTs - fromTs for each span)

Usage pattern for converting date -> age when event.age is missing:
  const roughAge  = Math.max(0, (dateTs - dobTs) / 1000);
  const railBase  = computeRailOffset(actor, roughAge);
  const actualAge = Math.max(0, (dateTs - railBase) / 1000);
*/
export function computeRailOffset(actor, targetAge) {
    const dobTs = ReferenceResolver.resolveOrigin(actor);
    if (!dobTs) return 0;

    const spans = [];
    const rawEras = actor.system.eras || {};

    const collectSpans = (events) => {
        for (const event of Object.values(events || {})) {
            if (!event.isSpan) continue;
            const eventAge = Number(event.age);
            if (!Number.isFinite(eventAge) || eventAge > targetAge) continue;
            if (!event.spanFromDate || !event.spanToDate) continue;
            const fromTs = parseDate(
                `${event.spanFromDate}T${event.spanFromTime || '12:00:00'}`
            )?.getTime();
            const toTs = parseDate(
                `${event.spanToDate}T${event.spanToTime || '12:00:00'}`
            )?.getTime();
            if (fromTs && toTs && toTs !== fromTs) {
                spans.push({ age: eventAge, fromTs, toTs });
            }
        }
    };

    for (const era of Object.values(rawEras)) {
        collectSpans(era.events);
        for (const exp of Object.values(era.experiences || {})) {
            collectSpans(exp.events);
        }
    }

    spans.sort((a, b) => a.age - b.age);

    let railBase = dobTs;
    for (const span of spans) {
        railBase += (span.toTs - span.fromTs);
    }
    return railBase;
}
