/**
 * TEMPORAL ENGINE: COMPUTE SPAN HUD DATA
 * Pre-computes all HUD display rows for span drag tooltips.
 *
 * TRINITY: This function owns the span-mode HUD data computation.
 * The UI (PointerMachine) only receives pre-formatted row objects
 * and appends them to its display rows. No Kernel physics calls,
 * no TTL date parsing, no raw actor data reads remain in the UI.
 *
 * @param {object} actor - Foundry actor (read-only, for spanRank and dob)
 * @param {object} latestState - Viewport's cached temporal state
 * @param {object} startWorld - Drag start world coords { eventAge, eventTime }
 * @param {object} currentWorld - Current pointer world coords { eventAge, eventTime }
 * @param {object} lore - Lore context from getLoreContext()
 * @returns {{ costRows: Array, poolRows: Array, validationRow: object|null }}
 */
import { computeSpanCost, computePoolAfterSpan } from '/systems/continuum-v2/modules/temporal-kernel/calculate-span-pool.js';
import { validateSpanPhysics } from '/systems/continuum-v2/modules/temporal-kernel/validate-span-physics.js';
import { parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { formatDurationCompact } from '/systems/continuum-v2/modules/temporal-translator/duration-converter.js';

export function computeSpanHudData(actor, latestState, startWorld, currentWorld, lore) {
  const costRows = [];
  const poolRows = [];
  let validationRow = null;

  // SPENT: cost of the proposed span
  const costSeconds = computeSpanCost({
    ts: startWorld.eventTime,
    arrivalTs: currentWorld.eventTime
  });
  costRows.push({
    label: 'SPENT',
    value: formatDurationCompact(costSeconds),
    color: '#ff6b6b'
  });

  // REMAINING: pool projection when spanRank > 0
  const spanRank = Number(actor?.system?.spanning?.span) || 0;
  if (spanRank > 0) {
    const dobStr = actor?.system?.personal?.dob;
    const genesisMs = dobStr ? parseDateToObjectiveMs(dobStr) : 0;
    const physicsNodes = latestState?.nodes || [];
    const kernelEvents = physicsNodes
      .filter(n => n.id !== 'now' && !n.isVirtual && !n.isBirth)
      .map(n => ({
        id: n.id,
        eventIsSpan: Boolean(n.isSpanOrigin || n.record?.eventIsSpan),
        eventIsRest: Boolean(n.isRest || n.record?.eventIsRest),
        ts: Number(n.y) || 0,
        arrivalTs: Number(n.arrivalY || n.y) || 0
      }));
    const pool = computePoolAfterSpan({
      spanLevel: spanRank,
      events: kernelEvents,
      genesisTs: genesisMs,
      proposedDepartureMs: startWorld.eventTime,
      proposedArrivalMs: currentWorld.eventTime
    });
    poolRows.push({
      label: 'REMAINING',
      value: pool.remainingFormatted,
      color: pool.isOverSpan ? '#ff0000' : '#28a745'
    });
  }

  // VALIDATION: physics legality check
  const validation = validateSpanPhysics(
    { y: startWorld.eventTime, arrivalY: currentWorld.eventTime, record: { eventIsSpan: true } },
    lore
  );
  if (!validation.isValid) {
    validationRow = { label: 'ILLEGAL', value: validation.error, color: '#ff0000' };
  } else if (validation.warning) {
    validationRow = { label: 'WARNING', value: validation.warning, color: '#ffd700' };
  }

  return { costRows, poolRows, validationRow };
}