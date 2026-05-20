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

// Minimal history fixtures
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

function makeGetOriginTime(val = 946684800000) {
  return () => val;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildRenderContext', () => {
  describe('null actor', () => {
    it('returns empty history and null values when actor is null', () => {
      const result = buildRenderContext(null, null, [], [], makeGetOriginTime());
      expect(result.history).toEqual([]);
      expect(result.subjectiveNow).toBeNull();
      expect(result.originTime).toBe(0);
      expect(result.isSpanIntent).toBe(false);
    });

    it('returns fallback originTime of 0 when getOriginTime is not provided', () => {
      const result = buildRenderContext(null, null, []);
      expect(result.originTime).toBe(0);
    });
  });

  describe('non-drag mode (idle)', () => {
    it('reads history from getActorHistory and captures baseline', () => {
      getActorHistory.mockReturnValue(baseHistory);
      const interaction = { isDragging: false, mode: null };
      const actor = makeActor();

      const result = buildRenderContext(actor, interaction, null, [], makeGetOriginTime(12345));

      expect(getActorHistory).toHaveBeenCalledWith(actor);
      expect(result.history).toBe(baseHistory);
      expect(result.subjectiveNow).toBeNull();
      expect(result.isSpanIntent).toBe(false);
      expect(result.originTime).toBe(12345);
    });

    it('does not call buildPreviewHistory in non-drag mode', () => {
      getActorHistory.mockReturnValue(baseHistory);
      const interaction = { isDragging: false, mode: 'span' };
      const actor = makeActor();

      buildRenderContext(actor, interaction, null, [], makeGetOriginTime());

      expect(buildPreviewHistory).not.toHaveBeenCalled();
      expect(calculateInsertionDisplacement).not.toHaveBeenCalled();
    });
  });

  describe('insert-span drag mode', () => {
    it('builds preview history from baseHistory and displacement', () => {
      const previewHistory = [...baseHistory, { id: 'preview-insert-span', record: {} }];
      buildPreviewHistory.mockReturnValue(previewHistory);
      const displacementResult = { departureAge: 15, departureTime: 1500, arrivalTime: 2500 };
      calculateInsertionDisplacement.mockReturnValue(displacementResult);

      const interaction = {
        isDragging: true,
        isPending: false,
        mode: 'insert-span',
        insertionContext: makeInsertionContext(),
        currentWorld: { eventAge: 15, eventTime: 2500 }
      };
      const actor = makeActor();
      const nodes = [{ id: 'evt-1', x: 10, y: 1000 }];

      const result = buildRenderContext(actor, interaction, baseHistory, nodes, makeGetOriginTime());

      expect(calculateInsertionDisplacement).toHaveBeenCalledWith(
        interaction.insertionContext.departureAge,
        interaction.insertionContext.departureTime,
        interaction.currentWorld.eventTime,
        nodes
      );
      expect(buildPreviewHistory).toHaveBeenCalledWith(
        baseHistory, interaction.insertionContext, displacementResult
      );
      expect(result.history).toBe(previewHistory);
      expect(result.subjectiveNow).toBeNull();
      expect(result.isSpanIntent).toBe(false);
    });

    it('falls through to getActorHistory when isPending is true', () => {
      // REGRESSION: Dialog open should not build preview from stale base
      getActorHistory.mockReturnValue(baseHistory);

      const interaction = {
        isDragging: true,
        isPending: true,
        mode: 'insert-span',
        insertionContext: makeInsertionContext(),
        currentWorld: { eventAge: 15, eventTime: 2500 }
      };
      const actor = makeActor();

      const result = buildRenderContext(actor, interaction, baseHistory, [], makeGetOriginTime());

      expect(buildPreviewHistory).not.toHaveBeenCalled();
      expect(result.history).toBe(baseHistory);
    });
  });

  describe('NOW drag - objectiveNow injection', () => {
    it('injects objectiveNow into a CLONED nowNode without mutating original', () => {
      // Deep clone to protect against shared references
      const historyClone = baseHistory.map(n => ({ ...n, record: { ...n.record } }));
      getActorHistory.mockReturnValue(historyClone);

      const interaction = {
        isDragging: true,
        isPending: false,
        mode: 'span',
        activeNodeId: 'now',
        currentWorld: { eventAge: 25, eventTime: 5000 },
        insertionContext: null
      };
      const actor = makeActor();

      const result = buildRenderContext(actor, interaction, null, [], makeGetOriginTime());

      // The returned history should have the injected objectiveNow
      const nowNode = result.history.find(n => n.id === 'now');
      expect(nowNode.record.objectiveNow).toBe(5000);

      // The ORIGINAL history must NOT be mutated
      expect(historyClone.find(n => n.id === 'now').record.objectiveNow).toBe(3000);
    });

    it('returns subjectiveNow matching drag position during NOW drag', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const interaction = {
        isDragging: true,
        isPending: false,
        mode: 'span',
        activeNodeId: 'now',
        currentWorld: { eventAge: 42, eventTime: 7000 },
        insertionContext: null
      };
      const actor = makeActor();

      const result = buildRenderContext(actor, interaction, null, [], makeGetOriginTime());

      expect(result.subjectiveNow).toBe(42);
    });

    it('returns isSpanIntent true when dragging NOW in span mode', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const interaction = {
        isDragging: true,
        isPending: false,
        mode: 'span',
        activeNodeId: 'now',
        currentWorld: { eventAge: 42, eventTime: 7000 },
        insertionContext: null
      };
      const actor = makeActor();

      const result = buildRenderContext(actor, interaction, null, [], makeGetOriginTime());

      expect(result.isSpanIntent).toBe(true);
    });

    it('returns isSpanIntent false when dragging NOW in level mode', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const interaction = {
        isDragging: true,
        isPending: false,
        mode: 'level',
        activeNodeId: 'now',
        currentWorld: { eventAge: 42, eventTime: 7000 },
        insertionContext: null
      };
      const actor = makeActor();

      const result = buildRenderContext(actor, interaction, null, [], makeGetOriginTime());

      expect(result.isSpanIntent).toBe(false);
    });

    it('returns subjectiveNow null when not dragging NOW', () => {
      getActorHistory.mockReturnValue(baseHistory);

      const interaction = {
        isDragging: false,
        mode: null,
        activeNodeId: null,
        currentWorld: null,
        insertionContext: null
      };
      const actor = makeActor();

      const result = buildRenderContext(actor, interaction, null, [], makeGetOriginTime());

      expect(result.subjectiveNow).toBeNull();
    });
  });

  describe('originTime', () => {
    it('calls getOriginTime callback and returns its value', () => {
      getActorHistory.mockReturnValue(baseHistory);
      const actor = makeActor();
      const interaction = { isDragging: false, mode: null };
      const getOriginTime = vi.fn(() => 946684800000);

      const result = buildRenderContext(actor, interaction, null, [], getOriginTime);

      expect(getOriginTime).toHaveBeenCalledOnce();
      expect(result.originTime).toBe(946684800000);
    });

    it('returns 0 when getOriginTime is not provided', () => {
      getActorHistory.mockReturnValue(baseHistory);
      const actor = makeActor();
      const interaction = { isDragging: false, mode: null };

      const result = buildRenderContext(actor, interaction, null, []);

      expect(result.originTime).toBe(0);
    });
  });
});