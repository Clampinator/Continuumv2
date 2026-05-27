import { generateExperiences } from '../lifeline/services/segment-generator/generate-experiences.js';
import { resolveYetNodes } from '../temporal-kernel/yet-physics.js';
import { getCurrentSpanCapacity } from '/systems/continuum-v2/modules/temporal-kernel/calculate-span-pool.js';
import { calculateAspectProgression } from '/systems/continuum-v2/modules/temporal-kernel/calculate-aspect-progression.js';
import { calculateLevelUp } from '/systems/continuum-v2/modules/temporal-kernel/calculate-level-up.js';
import { MS_PER_SECOND } from '/systems/continuum-v2/modules/temporal-engine/constants.js';

/**
 * ENGINE UNIT: FINALIZE STATE
 * Assembles the final temporal state object, including experience collation,
 * Yet node resolution, and aspect progression computation.
 * ENFORCES: Consistent output schema.
 */
export function finalizeState(segments, nodes, subjectiveNow, totalDisplacement = 0, eras = [], actor = null) {
  const nowNode = nodes.find(n => n.id === 'now');
  let experiences = [];
  let yetNodes = [];
  let progression = null;
  let levelingAge = null;

  // KERNEL: Span pool total from ranked capacity lookup (seconds -> ms)
  const spanLevel = actor ? (Number(actor.system.spanning?.span) || 0) : 0;
  const spanPoolTotalMs = getCurrentSpanCapacity(spanLevel) * MS_PER_SECOND;

  if (actor) {
    const erasWithIds = Object.entries(actor.system.eras || {}).map(([id, era]) => ({ ...era, id: id }))
      .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

    // LEVELING AGE: The character's subjective age WITHOUT span displacement.
    // This is the age that matters for game mechanics like The Forgetting
    // (opacity decay), experience bonus (distance from NOW), and now
    // aspect progression. Spanning moves the character in objective time
    // but does NOT age them - a character who spans from age 10 to year
    // 2050 is still subjectively age 10, not age 40.
    if (nowNode) {
      if (nowNode.isSpanOrigin && segments.length > 1) {
        const lastSegment = segments[segments.length - 1];
        levelingAge = lastSegment.startX;
      } else {
        levelingAge = nowNode.x !== undefined ? nowNode.x : (nowNode.age !== undefined ? nowNode.age : null);
      }
    }

    experiences = generateExperiences(erasWithIds, nodes, nowNode, levelingAge);

    // YET RESOLUTION: Compute Yet node positions and violation state.
    const nowAge = nowNode ? (nowNode.x !== undefined ? nowNode.x : 0) : 0;
    const nowTime = nowNode ? (nowNode.y !== undefined ? nowNode.y : 0) : 0;
    yetNodes = resolveYetNodes(actor.system.theYet, nowAge, nowTime);

    // ASPECT PROGRESSION: Compute how close each aspect is to level-up
    // based on accumulated subjective years in linked experiences.
    // Only computed for character actors with attributes.
    const attrs = actor.system.attributes;
    const metas = actor.system.metabilities;
    if (attrs && levelingAge !== null) {
      const currentLevels = {
        force: Number(attrs.force?.value) || 0,
        analyze: Number(attrs.analyze?.value) || 0,
        relate: Number(attrs.relate?.value) || 0,
        react: Number(attrs.react?.value) || 0,
        coercion: Number(metas?.coercion?.value) || 0,
        creativity: Number(metas?.creativity?.value) || 0,
        farsense: Number(metas?.farsense?.value) || 0,
        pk: Number(metas?.pk?.value) || 0,
        redaction: Number(metas?.redaction?.value) || 0
      };

      // FORGETTING TOGGLE: System setting controls whether The Forgetting
      // reduces progression credit for old/short experiences.
      const forgettingEnabled = game?.settings?.get('continuum-v2', 'forgettingAffectsProgression') ?? false;

      // Enrich raw eras data with startAgeSeconds/endAgeSeconds so the
      // kernel can compute subjective durations. mapDateToSubjective is
      // expensive, so we pre-compute ages from the experience generator.
      const enrichedEras = _enrichErasWithAges(erasWithIds, experiences);

      progression = calculateAspectProgression(
        enrichedEras, levelingAge, currentLevels, forgettingEnabled
      );

      // LEVEL-UP: Determine which aspects have enough accumulated years
      // to advance. Metability potential caps are enforced.
      const metabilityPotentials = {
        coercion: Number(metas?.coercion?.potential) || 0,
        creativity: Number(metas?.creativity?.potential) || 0,
        farsense: Number(metas?.farsense?.potential) || 0,
        pk: Number(metas?.pk?.potential) || 0,
        redaction: Number(metas?.redaction?.potential) || 0
      };

      const eligibleLevelUps = calculateLevelUp(progression, metabilityPotentials);
      progression._eligibleLevelUps = eligibleLevelUps;
    }
  }

  return {
    segments,
    nodes,
    nowNode,
    experiences,
    eras,
    yetNodes,
    levelingAge,
    progression,
    spanPool: { consumed: totalDisplacement, total: spanPoolTotalMs }
  };
}

/**
 * Enriches era experience data with startAgeSeconds/endAgeSeconds
 * derived from the already-computed experience bounding boxes.
 * This avoids re-parsing date strings in the kernel - the engine
 * has already done the age computation during experience generation.
 *
 * @param {Array} eras - Eras with raw experience data
 * @param {Array} computedExperiences - Experiences with startAge/endAge
 * @returns {Object} Eras object keyed by id, with ages injected
 */
function _enrichErasWithAges(eras, computedExperiences) {
  const result = {};
  for (const era of eras) {
    const eraId = era.id;
    const exps = Object.entries(era.experiences || {}).map(([expId, exp]) => {
      // Find the matching computed experience to get age data
      const computed = computedExperiences.find(ce => ce.id === expId);
      return [expId, {
        ...exp,
        startAgeSeconds: computed ? computed.startAge : null,
        endAgeSeconds: computed ? computed.endAge : null
      }];
    });
    result[eraId] = {
      ...era,
      experiences: Object.fromEntries(exps)
    };
  }
  return result;
}
