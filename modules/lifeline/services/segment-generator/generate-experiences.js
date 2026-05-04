import { parseDate } from '../../../span-graph-utils/parse-date.js';
import { mapDateToSubjective } from '../../../span-graph-utils/map-date-to-subjective.js';

/**
 * NODE-ANCHORED EXPERIENCE GENERATOR
 *
 * Produces a flat array of experience bounding boxes. Each box's corners are
 * anchored to the Event nodes that open and close the experience, not to
 * independent date strings. This guarantees pixel-perfect alignment between
 * experience boxes and the event nodes on the span graph.
 *
 * Anchoring strategy (priority order):
 *   1. OPENER node: record.startsExpId === expId OR record.isExpStart === true
 *      matched to this experience. Fallback: first node in the chain.
 *   2. CLOSER node: record.endsExpId === expId (era-level event that closed
 *      this experience). Fallback: record.isExpEnd === true. Legacy fallback:
 *      date-matching (event timestamp matches exp.dateTo). Final fallback:
 *      dateTo string interpolation.
 *   3. If no chain nodes exist at all, fall back to mapDateToSubjective
 *      using the experience's dateFrom/dateTo strings.
 *
 * Ongoing experiences anchor their end corner to the NOW node.
 *
 * SPAN DECOUPLING: The Forgetting opacity and experience bonus use the
 * character's LEVELING AGE (subjective age without span displacement)
 * rather than the NOW node's raw age. Spans do not age the character,
 * so spanning up/down should not affect how "far away" an experience feels.
 *
 * Field name convention: startAge/endAge (seconds), startTime/endTime (epoch ms).
 * Dual-format accessors handle both .age/.time (new) and .x/.y (legacy) nodes.
 *
 * @param {Array} sortedEras - Eras sorted by subjective age, each with .experiences
 * @param {Array} nodes - Flat history nodes (may be .age/.time or .x/.y format)
 * @param {Object} nowNode - The NOW anchor node
 * @param {number|null} levelingAge - Subjective age without span displacement.
 *   If null, falls back to nowNode's age (which may include span displacement).
 * @returns {Array} Experience objects with startAge, endAge, startTime, endTime,
 *   isOngoing, isClosed, opacity, bonus
 */
export function generateExperiences(sortedEras, nodes, nowNode, levelingAge = null) {
    const experiences = [];
    if (!nodes || nodes.length === 0) return experiences;

    // Dual-format accessors: new engine uses .age/.time, legacy uses .x/.y.
    // .age/.time takes priority because the engine is the primary producer.
    // Null guard: some node arrays may contain undefined entries from empty segments.
    const _age = (n) => n ? (n.age !== undefined ? n.age : n.x) : null;
    const _time = (n) => n ? (n.time !== undefined ? n.time : n.y) : null;
    // _openTime: for span nodes, returns arrivalY (where the character lands and
    // starts living), not y (departure). Level events behave identically to _time.
    const _openTime = (n) => {
        if (!n) return null;
        if (n.isSpanOrigin || n.record?.eventIsSpan) return n.arrivalY ?? _time(n);
        return _time(n);
    };

    // LEVELING AGE: The character's subjective age WITHOUT span displacement.
    // Spans move the character in objective time but do NOT age them. For game
    // mechanics (The Forgetting opacity, experience bonus distance), what
    // matters is how long ago the character subjectively experienced something,
    // not where they are in objective time. If levelingAge is not provided
    // (legacy callers), fall back to the NOW node's raw age.
    const nowAge = levelingAge !== null ? levelingAge : _age(nowNode);

    // SPAN-AWARE END TIME: Used for the visual bounding box of ongoing
    // experiences. This is the NOW node's raw Y coordinate (objective time),
    // which DOES move when spanning. The box visually extends to where the
    // character is NOW, even mid-span. Separate from nowAge (leveling age)
    // because the box corner needs screen coordinates for rendering.
    const nowTime = _time(nowNode);

    // Birth timestamp derived from first node - fallback for mapDateToSubjective
    const dobTs = _time(nodes[0]);

    sortedEras.forEach(era => {
        Object.entries(era.experiences || {}).forEach(([expId, exp]) => {
            // Skip experiences that lack a name (malformed or placeholder data)
            if (!exp.name) return;

            // CHAIN ASSEMBLY: Gather all nodes that belong to this experience.
            // Membership criteria (in order of specificity):
            //   - n.expId === expId (top-level property from getActorHistory)
            //   - n.record.startsExpId === expId (opener event link)
            //   - n.record.isExpStart === true with matching expId on the node
            // The chain determines which event nodes anchor the box corners.
            const chain = nodes.filter(n =>
                n.expId === expId ||
                n.record?.startsExpId === expId ||
                (n.record?.isExpStart && n.expId === expId)
            );
            chain.sort((a, b) => (Number(_age(a)) || 0) - (Number(_age(b)) || 0));

            // OPENER: The event node that starts this experience.
            // Prefer nodes explicitly marked as starters, then the first chain node.
            let openerNode = null;
            if (chain.length > 0) {
                openerNode = chain.find(n =>
                    n.record?.startsExpId === expId || n.record?.isExpStart === true
                ) || chain[0];
            }

            // CLOSED vs ONGOING: isClosed is data-driven (dateTo is non-empty).
            // isOngoing is true if explicitly flagged OR if not closed.
            const isClosed = !!(exp.dateTo && String(exp.dateTo).trim() !== "");
            const isOngoing = !!exp.isOngoing || !isClosed;

            // CLOSER: The event node that ends this experience.
            // Search priority:
            //   1. endsExpId === expId (explicit back-link from closing event)
            //   2. isExpEnd flag (NPC-generated data or chain-internal closers)
            //   3. DATE MATCH: For legacy data closed before endsExpId existed,
            //      find an era-level node whose combined date+time matches exp.dateTo.
            //      This recovers the closing event for existing saved data.
            let closerNode = null;
            if (isClosed) {
                closerNode = nodes.find(n => n.record?.endsExpId === expId) || null;
                if (!closerNode) {
                    closerNode = nodes.find(n => n.record?.isExpEnd === true) || null;
                }
                if (!closerNode) {
                    closerNode = _findCloserByDate(nodes, exp.dateTo) || null;
                }
            }

            let startAge;
            let startTime;

            if (openerNode && _age(openerNode) !== null) {
                // ANCHOR START: Use the opener event node's exact coordinates.
                // This guarantees the experience box corner aligns with the
                // rendered event node on the span graph.
                // For span openers: use arrivalY (arrival time) not y (departure).
                startAge = _age(openerNode);
                startTime = _openTime(openerNode);
            } else if (chain.length > 0) {
                // CHAIN FALLBACK: First chain node as opener.
                startAge = _age(chain[0]);
                startTime = _openTime(chain[0]);
            } else {
                // DATE FALLBACK: No events belong to this experience yet.
                // Fall back to date-string interpolation via mapDateToSubjective.
                const startD = parseDate(exp.dateFrom);
                if (!startD) return;
                startAge = mapDateToSubjective(exp.dateFrom, nodes, dobTs);
                startTime = startD.getTime();
            }

            let endAge;
            let endTime;

            if (isOngoing) {
                // Ongoing experiences extend to the NOW node - the character is
                // still living through them, so the box grows with time.
                // Use NOW node's raw coordinates for the visual bounding box,
                // NOT the leveling age. The box must reach the character's
                // actual position on the graph, even mid-span.
                const nowRawAge = _age(nowNode);
                endAge = nowRawAge !== null ? nowRawAge : nowAge;
                endTime = nowTime;
            } else if (closerNode && _age(closerNode) !== null) {
                // ANCHOR END: Use the closer event node's exact coordinates.
                // This node carries isExpEnd, marking it as the definitive end.
                endAge = _age(closerNode);
                endTime = _time(closerNode);
            } else {
                // CLOSED EXPERIENCE without explicit closer node: Use the
                // experience's dateTo as the authoritative end boundary. The
                // dateTo was set by the user when they closed the experience,
                // so it's the correct closing point even if no chain node
                // marks that exact moment. Chain nodes are interior events
                // that should NOT define the experience's outer boundary.
                const endD = parseDate(exp.dateTo);
                if (endD) {
                    endAge = mapDateToSubjective(exp.dateTo, nodes, dobTs) || startAge;
                    endTime = endD.getTime();
                } else if (chain.length > 0) {
                    // No dateTo and no closer: fall back to last chain node.
                    const lastNode = chain[chain.length - 1];
                    endAge = _age(lastNode);
                    endTime = _time(lastNode);
                } else {
                    // Last resort: collapse to start.
                    endAge = startAge;
                    endTime = startTime;
                }
            }

            // ELASTIC EXPANSION: Chain events can push the start boundary earlier
            // than the opener node (e.g. a re-opened experience where a mid-chain
            // event predates the opener). However, for CLOSED experiences the end
            // boundary is authoritative (dateTo or closer node) and must NOT be
            // shrunk by chain events that end before it. Ongoing experiences can
            // still be expanded by chain events since they extend to NOW.
            if (chain.length > 0) {
                const firstAge = _age(chain[0]);
                const firstTime = _openTime(chain[0]);
                if (firstAge !== null) startAge = Math.min(startAge, firstAge);
                if (firstTime !== null) startTime = Math.min(startTime, firstTime);
                // Only expand the end boundary if the experience is ongoing.
                // Closed experiences have an authoritative end from dateTo/closer.
                if (isOngoing) {
                    const lastAge = _age(chain[chain.length - 1]);
                    const lastTime = _time(chain[chain.length - 1]);
                    if (lastAge !== null) endAge = Math.max(endAge, lastAge);
                    if (lastTime !== null) endTime = Math.max(endTime, lastTime);
                }
            }

            // Guard: skip experiences where coordinate resolution failed
            if (startAge === null || endAge === null || startTime === null || endTime === null) return;

            // THE FORGETTING: Opacity decays linearly from 100% to 10% over
            // 15 subjective years after the experience ends, then lingers at
            // 10%. This models the Continuum RPG mechanic where old skills
            // fade but never fully vanish.
            // SPAN DECOUPLING: Uses nowAge (leveling age) not the raw NOW node
            // age, because spanning does not age the character. A character who
            // spans to 2050 at subjective age 10 is still only 10 years old
            // for purposes of The Forgetting.
            const yearsSince = Math.max(0, (nowAge - endAge) / 31536000);
            let opacity = 1.0;
            if (yearsSince > 0) {
                opacity = Math.max(0.1, 1.0 - (yearsSince / 15) * 0.9);
            }

            // MECHANICAL VALUES: Duration and distance for the Two-Axis Bonus
            // must use the leveling age, not the span-inflated visual age.
            // For ongoing experiences, the effective duration is how long the
            // character has subjectively been in the experience, not where the
            // visual box ends on the graph.
            const mechanicalEndAge = isOngoing ? nowAge : endAge;

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
                bonus: _calculateBonus(isOngoing, mechanicalEndAge, startAge, nowAge)
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

/**
 * DATE-MATCH CLOSER FINDER
 * For legacy data closed before endsExpId existed, attempts to find the
 * closing event by matching the event's combined date+time against the
 * experience's dateTo string. The dateTo was set to the closing event's
 * departure timestamp when the user closed the experience, so a level
 * event whose eventDate + " " + eventTime matches dateTo is very likely
 * the closer. For span events, checks eventSpanFromDate + " " + eventSpanFromTime.
 *
 * @param {Array} nodes - All history nodes
 * @param {string} dateTo - The experience's dateTo string (e.g. "2022-06-15 12:00:00")
 * @returns {Object|null} The matching node, or null
 */
function _findCloserByDate(nodes, dateTo) {
    if (!dateTo || !dateTo.trim()) return null;
    const normalized = dateTo.trim();
    return nodes.find(n => {
        if (!n.record) return false;
        // Level events: eventDate + " " + eventTime
        const levelDT = `${n.record.eventDate || ''} ${n.record.eventTime || ''}`.trim();
        if (levelDT === normalized) return true;
        // Span events: departure timestamp
        const spanDT = `${n.record.eventSpanFromDate || ''} ${n.record.eventSpanFromTime || ''}`.trim();
        if (spanDT === normalized) return true;
        return false;
    }) || null;
}