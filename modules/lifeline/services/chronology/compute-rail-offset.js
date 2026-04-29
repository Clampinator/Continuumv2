import { ReferenceResolver } from '../reference-resolver.js';
import { parseDate } from '../../../span-graph-utils/provide-span-graph-utils.js';
import { computeRailOffset as computeRailOffsetPhysics } from '/systems/continuum-v2/modules/temporal-kernel/compute-rail-offset.js';

/**
 * Thin wrapper: extracts span data from the Foundry actor, then delegates
 * the rail-offset math to the pure kernel function.
 *
 * DELEGATE: All accumulation math lives in temporal-kernel/compute-rail-offset.js
 * THIN WRAPPER: This function only handles actor -> data extraction.
 *
 * @param {object} actor - Foundry actor instance.
 * @param {number} targetAge - Subjective age in seconds.
 * @returns {number} Rail base timestamp in milliseconds.
 */
export function computeRailOffset(actor, targetAge) {
    const dobTs = ReferenceResolver.resolveOrigin(actor);
    if (!dobTs) return 0;

    const spans = _collectSpansFromActor(actor, targetAge);

    return computeRailOffsetPhysics(dobTs, targetAge, spans);
}

/**
 * Extracts span data from the actor's eras into the format the kernel expects.
 * @param {object} actor - Foundry actor instance.
 * @param {number} targetAge - Maximum age to include.
 * @returns {Array} Array of { age, fromTs, toTs } objects sorted by age.
 */
function _collectSpansFromActor(actor, targetAge) {
    const spans = [];
    const rawEras = actor.system.eras || {};

    const collectFromEvents = (events) => {
        for (const event of Object.values(events || {})) {
            if (!event.eventIsSpan) continue;
            const eventAge = Number(event.eventAge);
            if (!Number.isFinite(eventAge)) continue;
            if (!event.eventSpanFromDate || !event.eventSpanToDate) continue;
            const fromTs = parseDate(
                `${event.eventSpanFromDate}T${event.eventSpanFromTime || '12:00:00'}`
            )?.getTime();
            const toTs = parseDate(
                `${event.eventSpanToDate}T${event.eventSpanToTime || '12:00:00'}`
            )?.getTime();
            if (fromTs && toTs && toTs !== fromTs) {
                spans.push({ age: eventAge, fromTs, toTs });
            }
        }
    };

    for (const era of Object.values(rawEras)) {
        collectFromEvents(era.events);
        for (const exp of Object.values(era.experiences || {})) {
            collectFromEvents(exp.events);
        }
    }

    spans.sort((a, b) => a.age - b.age);
    return spans;
}