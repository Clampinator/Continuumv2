import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../modules/state/get-actor-history.js', () => ({
  getActorHistory: vi.fn()
}));
vi.mock('../../modules/temporal-engine/build-preview-history.js', () => ({
  buildPreviewHistory: vi.fn()
}));
vi.mock('../../modules/temporal-kernel/calculate-insertion-displacement.js', () => ({
  calculateInsertionDisplacement: vi.fn()
}));

import { buildRenderContext } from '../../modules/span-graph/projection/build-render-context.js';
import { getActorHistory } from '../../modules/state/get-actor-history.js';
import { buildPreviewHistory } from '../../modules/temporal-engine/build-preview-history.js';
import { calculateInsertionDisplacement } from '../../modules/temporal-kernel/calculate-insertion-displacement.js';

/*
 * REGRESSION TESTS FOR H3 REFACTORING
 *
 * These tests guard against regressions introduced when the viewport's
 * _render() method was decomposed into buildRenderContext(). The old
 * inline logic had several subtle behaviors that must be preserved
 * exactly when the logic moved into a pure function.
 *
 * Original violation: viewport._render() directly mutated
 * nowNode.record.objectiveNow, derived subjectiveNow and isSpanIntent
 * inline, and called getActorHistory/buildPreviewHistory directly.
 * The refactoring must produce identical observable behavior without
 * these mutations.
 */

const baseHistory = [
  { id: 'evt-1', sort: 100, isNow: false, isBirth: false, record: { eventTitle: 'Event 1', eventIsSpan: false, ts: 1000, eventAge: 10 } },
  { id: 'evt-2', sort: 200, isNow: false, isBirth: false, record: { eventTitle: 'Event 2', eventIsSpan: false, ts: 2000, eventAge: 20 } },
  { id: 'now', sort: 999999999, isNow: true, record: { eventTitle: 'NOW', objectiveNow: 3000 } }
];

function makeActor() {
  return { id: 'test-actor', system: { personal: { dob: '2000-01-01' } } };
}

function makeInsertionContext() {
  return {
    departureAge: 15,
    departureTime: 1500,
    insertionSort: 150,
    beforeNode: { id: 'evt-1', age: 10 }
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('H3 Regression: buildRenderContext', () => {

  /*
   * REGRESSION: The old viewport code read actor data in three different
   * branches (insert-span preview vs NOW drag vs idle). Each branch
   * produced a different history. buildRenderContext must preserve
   * the exact same branching logic.
   */

  describe('branch selection matches old viewport._render()', () => {

    it('idle interaction reads from getActorHistory (not preview)', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: false, isPending: false, mode: null },
        null, [], () => 0
      );

      expect(getActorHistory).toHaveBeenCalledTimes(1);
      expect(buildPreviewHistory).not.toHaveBeenCalled();
      expect(result.history).toBe(baseHistory);
    });

    it('level NOW drag reads from getActorHistory (not preview)', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'level', activeNodeId: 'now',
          currentWorld: { eventAge: 25, eventTime: 5000 } },
        null, [], () => 0
      );

      expect(getActorHistory).toHaveBeenCalledTimes(1);
      expect(buildPreviewHistory).not.toHaveBeenCalled();
    });

    it('span NOW drag reads from getActorHistory (not preview)', () => {
      getActorHistory.mockReturnValue(baseHistory);

      buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'span', activeNodeId: 'now',
          currentWorld: { eventAge: 25, eventTime: 5000 } },
        null, [], () => 0
      );

      expect(getActorHistory).toHaveBeenCalledTimes(1);
      expect(buildPreviewHistory).not.toHaveBeenCalled();
    });

    it('insert-span drag reads from buildPreviewHistory (not getActorHistory)', () => {
      const preview = [...baseHistory, { id: 'preview-insert-span', record: {} }];
      buildPreviewHistory.mockReturnValue(preview);
      calculateInsertionDisplacement.mockReturnValue({ departureAge: 15, departureTime: 1500, arrivalTime: 2500 });

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'insert-span',
          insertionContext: makeInsertionContext(),
          currentWorld: { eventAge: 15, eventTime: 2500 } },
        baseHistory, [], () => 0
      );

      expect(buildPreviewHistory).toHaveBeenCalledTimes(1);
      expect(getActorHistory).not.toHaveBeenCalled();
      expect(result.history).toBe(preview);
    });
  });

  /*
   * REGRESSION: The old code used `isDragging && !isPending` to gate
   * both insert-span preview and NOW drag injection. The `!isPending`
   * check was critical: when a dialog is open (isPending=true), the
   * committed DB state must be authoritative.
   */

  describe('isPending gate', () => {

    it('isPending=true with insert-span context falls through to getActorHistory', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: true, mode: 'insert-span',
          insertionContext: makeInsertionContext(),
          currentWorld: { eventAge: 15, eventTime: 2500 } },
        baseHistory, [], () => 0
      );

      expect(getActorHistory).toHaveBeenCalledTimes(1);
      expect(buildPreviewHistory).not.toHaveBeenCalled();
      expect(result.subjectiveNow).toBeNull();
    });

    it('isPending=true with NOW drag does NOT inject objectiveNow', () => {
      const historyClone = baseHistory.map(n => ({ ...n, record: { ...n.record } }));
      getActorHistory.mockReturnValue(historyClone);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: true, mode: 'span', activeNodeId: 'now',
          currentWorld: { eventAge: 25, eventTime: 5000 } },
        null, [], () => 0
      );

      // NOW node must retain its DB value (3000), not the drag value (5000)
      const nowNode = result.history.find(n => n.id === 'now');
      expect(nowNode.record.objectiveNow).toBe(3000);

      // subjectiveNow must be null (not the drag position)
      expect(result.subjectiveNow).toBeNull();

      // isSpanIntent must be false (drag is blocked by isPending)
      expect(result.isSpanIntent).toBe(false);
    });
  });

  /*
   * REGRESSION: The old viewport code directly mutated
   * nowNode.record.objectiveNow. The refactored code MUST clone the
   * history array and the record object. If it mutates the original,
   * subsequent renders will see stale drag values instead of DB values.
   */

  describe('NOW drag NEVER mutates the original history', () => {

    it('cloned history has updated objectiveNow; original is untouched', () => {
      const original = baseHistory.map(n => ({ ...n, record: { ...n.record } }));
      getActorHistory.mockReturnValue(original);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'span', activeNodeId: 'now',
          currentWorld: { eventAge: 30, eventTime: 9000 } },
        null, [], () => 0
      );

      // Returned history has the drag value
      expect(result.history.find(n => n.id === 'now').record.objectiveNow).toBe(9000);

      // Original history is completely untouched
      expect(original.find(n => n.id === 'now').record.objectiveNow).toBe(3000);

      // They are different ARRAY references (shallow copy)
      expect(result.history).not.toBe(original);
    });

    it('cloned record does not share object identity with original', () => {
      const original = baseHistory.map(n => ({ ...n, record: { ...n.record } }));
      getActorHistory.mockReturnValue(original);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'level', activeNodeId: 'now',
          currentWorld: { eventAge: 30, eventTime: 9000 } },
        null, [], () => 0
      );

      const resultNow = result.history.find(n => n.id === 'now');
      const originalNow = original.find(n => n.id === 'now');

      // Record objects are different references
      expect(resultNow.record).not.toBe(originalNow.record);

      // Non-objectiveNow fields are preserved
      expect(resultNow.record.eventTitle).toBe('NOW');
      expect(resultNow.id).toBe('now');
      expect(resultNow.sort).toBe(999999999);
    });

    it('history without NOW node is returned unchanged when dragging NOW', () => {
      // Edge case: history has no NOW node (e.g. fresh character)
      const historyNoNow = [
        { id: 'evt-1', sort: 100, isNow: false, isBirth: false, record: { eventTitle: 'Event 1' } }
      ];
      const frozen = historyNoNow.map(n => ({ ...n }));
      getActorHistory.mockReturnValue(historyNoNow);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'span', activeNodeId: 'now',
          currentWorld: { eventAge: 25, eventTime: 5000 } },
        null, [], () => 0
      );

      // No NOW node found - objectiveNow injection skipped, history unchanged
      // subjectiveNow is still set based on the drag context
      expect(result.subjectiveNow).toBe(25);
      expect(result.history).toBe(historyNoNow);
      // Verify no mutation of the array elements
      expect(historyNoNow[0].record).toEqual(frozen[0].record);
    });
  });

  /*
   * REGRESSION: The old code derived isSpanIntent from
   * `isDraggingNow && mode === 'span'`. This must be preserved exactly -
   * level drags must produce isSpanIntent=false, span drags must produce
   * isSpanIntent=true, and idle must produce false.
   */

  describe('isSpanIntent derivation matches old logic', () => {

    it('isSpanIntent=true only for span-mode NOW drag', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'span', activeNodeId: 'now',
          currentWorld: { eventAge: 25, eventTime: 5000 } },
        null, [], () => 0
      );

      expect(result.isSpanIntent).toBe(true);
    });

    it('isSpanIntent=false for level-mode NOW drag', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'level', activeNodeId: 'now',
          currentWorld: { eventAge: 25, eventTime: 5000 } },
        null, [], () => 0
      );

      expect(result.isSpanIntent).toBe(false);
    });

    it('isSpanIntent=false for insert-span drag (not NOW)', () => {
      const preview = [...baseHistory, { id: 'preview-insert-span', record: {} }];
      buildPreviewHistory.mockReturnValue(preview);
      calculateInsertionDisplacement.mockReturnValue({ departureAge: 15, departureTime: 1500, arrivalTime: 2500 });

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'insert-span',
          insertionContext: makeInsertionContext(),
          currentWorld: { eventAge: 15, eventTime: 2500 } },
        baseHistory, [], () => 0
      );

      expect(result.isSpanIntent).toBe(false);
    });

    it('isSpanIntent=false when not dragging at all', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: false, mode: null },
        null, [], () => 0
      );

      expect(result.isSpanIntent).toBe(false);
    });

    it('isSpanIntent=false when isPending', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: true, mode: 'span', activeNodeId: 'now',
          currentWorld: { eventAge: 25, eventTime: 5000 } },
        null, [], () => 0
      );

      expect(result.isSpanIntent).toBe(false);
    });
  });

  /*
   * REGRESSION: The old code derived subjectiveNow as:
   *   isDraggingNow ? interaction.currentWorld.eventAge : null
   * This must be preserved - non-NOW drags produce null, idle produces null.
   */

  describe('subjectiveNow derivation matches old logic', () => {

    it('subjectiveNow=eventAge during NOW drag', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'level', activeNodeId: 'now',
          currentWorld: { eventAge: 42, eventTime: 7000 } },
        null, [], () => 0
      );

      expect(result.subjectiveNow).toBe(42);
    });

    it('subjectiveNow=null during non-NOW drag (insert-span)', () => {
      const preview = [...baseHistory, { id: 'preview-insert-span', record: {} }];
      buildPreviewHistory.mockReturnValue(preview);
      calculateInsertionDisplacement.mockReturnValue({ departureAge: 15, departureTime: 1500, arrivalTime: 2500 });

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'insert-span',
          insertionContext: makeInsertionContext(),
          currentWorld: { eventAge: 15, eventTime: 2500 } },
        baseHistory, [], () => 0
      );

      expect(result.subjectiveNow).toBeNull();
    });

    it('subjectiveNow=null when idle', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: false, mode: null },
        null, [], () => 0
      );

      expect(result.subjectiveNow).toBeNull();
    });

    it('subjectiveNow=null when activeNodeId is not "now"', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'level', activeNodeId: 'evt-1',
          currentWorld: { eventAge: 10, eventTime: 1000 } },
        null, [], () => 0
      );

      expect(result.subjectiveNow).toBeNull();
    });
  });

  /*
   * REGRESSION: The old code passed latestState?.nodes to
   * calculateInsertionDisplacement. This must be preserved - if
   * latestStateNodes is null/undefined, an empty array falls through.
   */

  describe('insert-span displacement gets correct nodes input', () => {

    it('passes latestStateNodes to calculateInsertionDisplacement', () => {
      buildPreviewHistory.mockReturnValue(baseHistory);
      calculateInsertionDisplacement.mockReturnValue({ departureAge: 15, departureTime: 1500, arrivalTime: 2500 });

      const nodes = [
        { id: 'evt-1', x: 10, y: 1000 },
        { id: 'evt-2', x: 20, y: 2000 }
      ];

      buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'insert-span',
          insertionContext: makeInsertionContext(),
          currentWorld: { eventAge: 15, eventTime: 2500 } },
        baseHistory, nodes, () => 0
      );

      expect(calculateInsertionDisplacement).toHaveBeenCalledWith(
        15, 1500, 2500, nodes
      );
    });

    it('passes empty array when latestStateNodes is null', () => {
      buildPreviewHistory.mockReturnValue(baseHistory);
      calculateInsertionDisplacement.mockReturnValue({ departureAge: 15, departureTime: 1500, arrivalTime: 2500 });

      buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'insert-span',
          insertionContext: makeInsertionContext(),
          currentWorld: { eventAge: 15, eventTime: 2500 } },
        baseHistory, null, () => 0
      );

      expect(calculateInsertionDisplacement).toHaveBeenCalledWith(
        15, 1500, 2500, []
      );
    });

    it('uses baseHistory or empty array when baseHistory is null', () => {
      buildPreviewHistory.mockReturnValue(baseHistory);
      calculateInsertionDisplacement.mockReturnValue({ departureAge: 15, departureTime: 1500, arrivalTime: 2500 });

      buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'insert-span',
          insertionContext: makeInsertionContext(),
          currentWorld: { eventAge: 15, eventTime: 2500 } },
        null, [], () => 0
      );

      // baseHistory was null, so buildPreviewHistory receives []
      expect(buildPreviewHistory).toHaveBeenCalledWith([], expect.anything(), expect.anything());
    });
  });

  /*
   * REGRESSION: The old code had a specific condition:
   *   isDragging && !isPending && activeNodeId === 'now' && currentWorld
   * Each sub-condition matters. Missing any produces wrong behavior.
   */

  describe('isDraggingNow requires all four conditions', () => {

    it('NOT isDraggingNow when isDragging is false', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: false, isPending: false, mode: 'span', activeNodeId: 'now',
          currentWorld: { eventAge: 25, eventTime: 5000 } },
        null, [], () => 0
      );

      // No injection, subjectiveNow is null
      expect(result.history.find(n => n.id === 'now').record.objectiveNow).toBe(3000);
      expect(result.subjectiveNow).toBeNull();
    });

    it('NOT isDraggingNow when isPending is true', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: true, mode: 'span', activeNodeId: 'now',
          currentWorld: { eventAge: 25, eventTime: 5000 } },
        null, [], () => 0
      );

      expect(result.history.find(n => n.id === 'now').record.objectiveNow).toBe(3000);
      expect(result.subjectiveNow).toBeNull();
    });

    it('NOT isDraggingNow when activeNodeId is not "now"', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'span', activeNodeId: 'evt-1',
          currentWorld: { eventAge: 25, eventTime: 5000 } },
        null, [], () => 0
      );

      expect(result.history.find(n => n.id === 'now').record.objectiveNow).toBe(3000);
      expect(result.subjectiveNow).toBeNull();
    });

    it('NOT isDraggingNow when currentWorld is null', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'span', activeNodeId: 'now',
          currentWorld: null },
        null, [], () => 0
      );

      expect(result.history.find(n => n.id === 'now').record.objectiveNow).toBe(3000);
      expect(result.subjectiveNow).toBeNull();
    });

    it('IS isDraggingNow when all four conditions are met', () => {
      const historyClone = baseHistory.map(n => ({ ...n, record: { ...n.record } }));
      getActorHistory.mockReturnValue(historyClone);

      const result = buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'span', activeNodeId: 'now',
          currentWorld: { eventAge: 25, eventTime: 5000 } },
        null, [], () => 0
      );

      expect(result.history.find(n => n.id === 'now').record.objectiveNow).toBe(5000);
      expect(result.subjectiveNow).toBe(25);
    });
  });

  /*
   * REGRESSION: The old code used the viewport's this._baseHistory for
   * preview builds (not this.latestHistory). The new code receives it
   * as a parameter. Verify the correct relationship.
   */

  describe('baseHistory vs latestHistory distinction', () => {

    it('insert-span uses baseHistory parameter, not getActorHistory result', () => {
      const preview = [...baseHistory, { id: 'preview-insert-span', record: {} }];
      buildPreviewHistory.mockReturnValue(preview);
      calculateInsertionDisplacement.mockReturnValue({ departureAge: 15, departureTime: 1500, arrivalTime: 2500 });

      const capturedBaseline = [
        { id: 'base-1', sort: 50, isNow: false, isBirth: false, record: {} }
      ];

      buildRenderContext(
        makeActor(),
        { isDragging: true, isPending: false, mode: 'insert-span',
          insertionContext: makeInsertionContext(),
          currentWorld: { eventAge: 15, eventTime: 2500 } },
        capturedBaseline, [], () => 0
      );

      // buildPreviewHistory receives the baseHistory parameter, not getActorHistory
      expect(buildPreviewHistory).toHaveBeenCalledWith(capturedBaseline, expect.anything(), expect.anything());
      expect(getActorHistory).not.toHaveBeenCalled();
    });
  });

  /*
   * REGRESSION: originTime must come from the callback, not from the
   * viewport's _getOriginTime method directly. The callback pattern
   * ensures buildRenderContext stays pure and testable.
   */

  describe('originTime callback isolation', () => {

    it('calls getOriginTime exactly once per render', () => {
      getActorHistory.mockReturnValue(baseHistory);
      const getOriginTime = vi.fn(() => 946684800000);

      buildRenderContext(
        makeActor(),
        { isDragging: false, mode: null },
        null, [], getOriginTime
      );

      expect(getOriginTime).toHaveBeenCalledOnce();
    });

    it('does not call getOriginTime when actor is null (early return)', () => {
      const getOriginTime = vi.fn(() => 0);

      buildRenderContext(null, null, [], [], getOriginTime);

      expect(getOriginTime).not.toHaveBeenCalled();
    });
  });
});