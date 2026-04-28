import { parseDate } from '../../../span-graph-utils/parse-date.js';
import { mapDateToSubjective } from '../../../span-graph-utils/map-date-to-subjective.js';

/**
 * ELASTIC RESONANCE FIELDS: Dynamic Experience Segment Generator.
 *
 * Reads the nested era/experience structure from actor data and produces a flat
 * array of experience bounding boxes with screen-independent coordinates. Each
 * output object describes the experience's extent in subjective age (seconds
 * since birth) and objective time (epoch ms), plus computed opacity ("The
 * Forgetting") and mechanical bonus (two-axis Duration + Distance).
 *
 * Field name convention: startAge/endAge (seconds), startTime/endTime (epoch ms).
 * This aligns with the 2026-04-29 spec and matches what the span-graph
 * manifest-generator and experience-renderer consume.
 *
 * Node format compatibility: the engine pipeline produces nodes with .x/.y
 * (age/time) while tests and some legacy code use .age/.time. Accessors
 * (_age, _time) read both with .age preferred.
 *
 * @param {Array} sortedEras - Eras sorted by subjective age, each with .experiences
 * @param {Array} nodes - Flat history nodes (may be .age/.time or .x/.y format)
 * @param {Object} nowNode - The NOW anchor node
 * @returns {Array} Experience objects with startAge, endAge, startTime, endTime,
 *   isOngoing, isClosed, opacity, bonus
 */
export function generateExperiences(sortedEras, nodes, nowNode) {
    const experiences = [];
    if (!nodes || nodes.length === 0) return experiences;

    // Dual-format accessors: new engine uses .age/.time, legacy uses .x/.y.
    // .age/.time takes priority because the engine is the primary producer.
    const _age = (n) => n.age !== undefined ? n.age : n.x;
    const _time = (n) => n.time !== undefined ? n.time : n.y;

    // Current subjective age of NOW - used for The Forgetting opacity decay
    // and for ongoing experience boundary projection
    const nowAge = _age(nowNode);

    // Birth timestamp derived from first node - fallback for mapDateToSubjective
    const dobTs = _time(nodes[0]);

    sortedEras.forEach(era => {
        Object.entries(era.experiences || {}).forEach(([expId, exp]) => {
            // Skip experiences that lack a name (malformed or placeholder data)
            if (!exp.name) return;

            const startD = parseDate(exp.dateFrom);
            if (!startD) return;

            // BASELINE: Derive from the experience's declared start date.
            // mapDateToSubjective walks the lifeline path to find the correct
            // subjective age along the 1:1 diagonal, accounting for spans.
            let startAge = mapDateToSubjective(exp.dateFrom, nodes, dobTs);
            let startTime = startD.getTime();

            // ELASTICITY: If any events belong to this experience, expand the
            // bounding box to include them. This handles re-opened experiences
            // where a new event extends the box beyond dateFrom.
            // Chain includes nodes that reference this expId directly, plus
            // nodes whose record has startsExpId (the "opener" event link).
            const chain = nodes.filter(n => n.expId === expId || n.record?.startsExpId === expId);
            if (chain.length > 0) {
                // Sort by subjective age so firstNode/lastNode are deterministic
                chain.sort((a, b) => (Number(_age(a)) || 0) - (Number(_age(b)) || 0));
                const firstNode = chain[0];
                // Expand start backward if an event precedes the declared dateFrom
                startAge = Math.min(startAge ?? Infinity, _age(firstNode));
                startTime = Math.min(startTime, _time(firstNode));
            }

            // CLOSED vs ONGOING: isClosed is data-driven (dateTo is non-empty).
            // isOngoing is true if explicitly flagged OR if not closed.
            const isClosed = !!(exp.dateTo && String(exp.dateTo).trim() !== "");
            const isOngoing = !!exp.isOngoing || !isClosed;

            let endAge;
            let endTime;

            if (isOngoing) {
                // Ongoing experiences extend to the NOW node - the character is
                // still living through them, so the box grows with time.
                endAge = nowAge;
                endTime = _time(nowNode);
            } else {
                // CLOSED: End comes from dateTo, but elasticity may push it
                // further if the last chain event is beyond the declared date.
                const endD = parseDate(exp.dateTo);
                let projectedEndAge = mapDateToSubjective(exp.dateTo, nodes, dobTs);
                let projectedEndTime = endD ? endD.getTime() : startTime;

                if (chain.length > 0) {
                    const lastNode = chain[chain.length - 1];
                    // Take whichever is further: the date-derived end or the
                    // last event in the chain. This ensures the bounding box
                    // encompasses all content even if dateTo is conservative.
                    endAge = Math.max(projectedEndAge || 0, _age(lastNode));
                    endTime = projectedEndTime;
                } else {
                    // No chain events: fall back to date-derived projection
                    endAge = projectedEndAge || startAge;
                    endTime = projectedEndTime;
                }
            }

            // Guard: skip experiences where coordinate resolution failed
            if (startAge === null || endAge === null || startTime === null || endTime === null) return;

            // THE FORGETTING: Opacity decays linearly from 100% to 10% over
            // 15 subjective years after the experience ends, then lingers at
            // 10%. This models the Continuum RPG mechanic where old skills
            // fade but never fully vanish.
            const yearsSince = Math.max(0, (nowAge - endAge) / 31536000);
            let opacity = 1.0;
            if (yearsSince > 0) {
                opacity = Math.max(0.1, 1.0 - (yearsSince / 15) * 0.9);
            }

            experiences.push({
                id: expId,
                name: exp.name,
                eraId: era.id,
                startAge,
                endAge,
                startTime,
                endTime,
                isOngoing,
                isClosed,
                opacity,
                bonus: _calculateBonus(isOngoing, endAge, startAge, nowAge)
            });
        });
    });

    return experiences;
}

/**
 * TWO-AXIS BONUS: Duration + Distance from NOW, combined additively with a
 * hard cap of +3. This matches the Continuum RPG design where both how long
 * you did something and how recently you did it contribute to recall ability.
 *
 * Duration Bonus (how long the experience lasted):
 *   <6 months = 0, 6mo-2yr = +1, 2-4yr = +2, 4+yr = +3
 *
 * Distance Bonus (how long ago the experience ended, relative to NOW):
 *   <2yr = +3, 2-5yr = +2, 5-10yr = +1, >10yr = 0
 *
 * Ongoing experiences always get Distance = +3 (they never left active memory).
 *
 * @param {boolean} isOngoing - True if experience is still active
 * @param {number} endAge - End subjective age in seconds
 * @param {number} startAge - Start subjective age in seconds
 * @param {number} nowAge - Current NOW subjective age in seconds
 * @returns {number} Capped bonus value (0-3)
 */
function _calculateBonus(isOngoing, endAge, startAge, nowAge) {
    const SECONDS_PER_YEAR = 31536000;

    // DURATION AXIS: How long the character was in this experience
    const durationSeconds = endAge - startAge;
    const durationYears = durationSeconds / SECONDS_PER_YEAR;

    // Inclusive upper bounds to match the spec's range convention
    // (e.g., "6mo-2yr" includes 2yr in the +1 tier, "2-4yr" starts after 2yr)
    const durationBonus = durationYears < 0.5 ? 0
        : durationYears <= 2 ? 1
        : durationYears <= 4 ? 2
        : 3;

    // DISTANCE AXIS: How far in the subjective past the experience ended.
    // Ongoing experiences are always "recent" -> distance = 0 years -> +3.
    const distanceYears = isOngoing ? 0 : Math.max(0, (nowAge - endAge) / SECONDS_PER_YEAR);
    const distanceBonus = distanceYears < 2 ? 3
        : distanceYears <= 5 ? 2
        : distanceYears <= 10 ? 1
        : 0;

    // Hard cap: no skill check bonus can exceed +3 in Continuum
    return Math.min(durationBonus + distanceBonus, 3);
}