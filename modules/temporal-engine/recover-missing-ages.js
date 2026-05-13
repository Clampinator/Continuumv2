import { projectSubjectiveAge } from '../temporal-kernel/project-subjective-age.js';
import { computeRailOffset } from '../temporal-kernel/compute-rail-offset.js';

/**
 * ENGINE: RECOVER MISSING AGES
 * Two-pass rail-offset recovery for facts where record.eventAge is null.
 *
 * When the DB has no stored eventAge for an event (a legacy data gap),
 * the Engine must infer the age from the event's objective timestamp
 * and the character's rail structure.
 *
 * Algorithm:
 * 1. Collect resolved span data from other facts (spans with known ages
 *    and timestamps provide the rail structure).
 * 2. For each fact with null eventAge that has a resolvable ts:
 *    a. Rough pass: project age using DOB as offset (ignoring span displacements).
 *    b. Rail offset: look up the correct rail base at the rough age.
 *    c. Final pass: re-project age using the correct rail base.
 * 3. Facts with no resolvable ts get eventAge = 0 (birth age fallback).
 *
 * This replaces the two-pass recovery that previously lived in
 * span-graph-data-processor.js (flattenEvents), which violated Trinity
 * boundaries by calling Kernel projectSubjectiveAge and computeRailOffset
 * from the data extraction layer.
 *
 * @param {Array} facts - History facts from getActorHistory().
 *   Each fact has { id, sort, record: { eventAge, ts, arrivalTs, eventIsSpan, ... } }.
 * @param {number} dobTs - Character DOB timestamp in milliseconds.
 * @returns {Array} Same facts array with null ages recovered (mutated in place).
 */
export function recoverMissingAges(facts, dobTs) {
  if (!facts || facts.length === 0) return facts;
  if (!dobTs) return facts;

  // Collect resolved span data from facts that already have ages.
  // Spans with null ages are excluded (they need recovery themselves).
  const spans = _collectResolvedSpans(facts);

  for (const fact of facts) {
    // NOW node gets its age from the Kernel, not from recovery
    if (fact.isNow || fact.id === 'now') continue;

    // Skip facts that already have an age
    if (fact.record.eventAge !== null && fact.record.eventAge !== undefined) continue;

    // Need a resolvable timestamp to estimate age from
    const ts = Number(fact.record.ts);
    if (!Number.isFinite(ts) || ts === 0) {
      // No timestamp available - default to birth age
      fact.record.eventAge = 0;
      continue;
    }

    // PASS 1: Rough age using DOB offset (ignoring span displacements)
    const roughAge = projectSubjectiveAge(ts, dobTs);

    // PASS 2: Correct age using rail offset at rough age
    const railBase = computeRailOffset(dobTs, roughAge, spans);
    fact.record.eventAge = projectSubjectiveAge(ts, railBase);
  }

  return facts;
}

/**
 * Extracts resolved span data from the facts array.
 * Only includes spans where eventAge is not null and both departure
 * and arrival timestamps are present in the database.
 *
 * @param {Array} facts - History facts from getActorHistory().
 * @returns {Array} Array of { age, fromTs, toTs } objects sorted by age.
 */
function _collectResolvedSpans(facts) {
  const spans = [];
  for (const fact of facts) {
    if (!fact.record.eventIsSpan) continue;
    // Skip spans with null age (they need recovery themselves)
    if (fact.record.eventAge === null || fact.record.eventAge === undefined) continue;
    const age = Number(fact.record.eventAge);
    const fromTs = Number(fact.record.ts);
    const toTs = Number(fact.record.arrivalTs);
    if (!Number.isFinite(age) || !Number.isFinite(fromTs) || !Number.isFinite(toTs)) continue;
    if (toTs === fromTs) continue;
    spans.push({ age, fromTs, toTs });
  }
  spans.sort((a, b) => a.age - b.age);
  return spans;
}