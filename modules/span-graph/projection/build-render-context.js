import { getActorHistory } from '../../state/get-actor-history.js';
import { buildPreviewHistory } from '../../temporal-engine/build-preview-history.js';
import { calculateInsertionDisplacement } from '../../temporal-kernel/calculate-insertion-displacement.js';

/**
 * PROJECTION: BUILD RENDER CONTEXT
 * Extracts the history assembly and NOW-node injection logic from the
 * viewport's _render method into a pure function.
 *
 * The viewport should be a dumb consumer of pre-computed render data,
 * not a state orchestrator. This function owns three responsibilities
 * that previously lived in viewport._render():
 *
 * 1. Build the effective history (with preview injection if in
 *    insert-span drag mode).
 * 2. Inject the drag-time objectiveNow fact into a CLONED nowNode
 *    record (without mutating the original DB-sourced history).
 * 3. Derive subjectiveNow, isSpanIntent, and originTime from
 *    interaction state and the origin callback.
 *
 * @param {Object|null} actor - Foundry actor (for getActorHistory).
 * @param {Object|null} interaction - Viewport interaction state.
 * @param {Array} baseHistory - Last committed history from viewport._baseHistory.
 * @param {Array} latestStateNodes - Pre-computed nodes for displacement calculation.
 * @param {Function} getOriginTime - Callback returning the character's origin timestamp.
 * @returns {{ history: Array, subjectiveNow: number|null, originTime: number, isSpanIntent: boolean }}
 */
export function buildRenderContext(actor, interaction, baseHistory, latestStateNodes, getOriginTime) {
  if (!actor) {
    return { history: [], subjectiveNow: null, originTime: 0, isSpanIntent: false };
  }

  const isDragging = interaction?.isDragging && !interaction?.isPending;
  const isInsertSpan = interaction?.mode === 'insert-span' && isDragging;

  // 1. HISTORY ASSEMBLY
  // Insert-span mode builds a virtual preview history from the committed
  // baseline. All other modes read fresh from the database.
  let history;
  if (isInsertSpan && interaction.insertionContext && interaction.currentWorld) {
    const base = baseHistory || [];
    const displacementResult = calculateInsertionDisplacement(
      interaction.insertionContext.departureAge,
      interaction.insertionContext.departureTime,
      interaction.currentWorld.eventTime,
      latestStateNodes || []
    );
    history = buildPreviewHistory(base, interaction.insertionContext, displacementResult);
  } else {
    history = getActorHistory(actor);
  }

  // 2. NOW NODE INJECTION
  // During a NOW drag, the objective timestamp comes from the pointer,
  // not from the database. We shallow-copy the history array and replace
  // the nowNode entry with a cloned record carrying the live drag value.
  // This avoids mutating the original DB-sourced history.
  const isDraggingNow = isDragging && interaction?.activeNodeId === 'now' && interaction?.currentWorld;
  if (isDraggingNow) {
    const nowIdx = history.findIndex(n => n.id === 'now');
    if (nowIdx !== -1) {
      const original = history[nowIdx];
      history = [...history];
      history[nowIdx] = {
        ...original,
        record: { ...original.record, objectiveNow: interaction.currentWorld.eventTime }
      };
    }
  }

  // 3. SUBJECTIVE NOW, SPAN INTENT, AND ORIGIN TIME
  // The Kernel uses subjectiveNow to anchor physics; isSpanIntent
  // controls diagonal projection for the NOW node during span drags.
  // Both are null/false when not actively dragging NOW.
  const subjectiveNow = isDraggingNow
    ? interaction.currentWorld.eventAge
    : null;

  const isSpanIntent = isDragging && interaction?.activeNodeId === 'now' && interaction?.mode === 'span';

  const originTime = getOriginTime ? getOriginTime() : 0;

  return { history, subjectiveNow, originTime, isSpanIntent };
}