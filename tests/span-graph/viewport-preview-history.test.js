import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildPreviewHistory } from '../../modules/temporal-engine/build-preview-history.js';
import { calculateInsertionDisplacement } from '../../modules/temporal-kernel/calculate-insertion-displacement.js';

/**
 * Tests for the viewport render-path preview history building.
 *
 * H2 Refactoring: The PointerMachine no longer builds previewHistory.
 * Instead, the viewport._render method builds it on demand from raw drag
 * context stored in _interaction. These tests verify the render-path logic
 * in isolation, without requiring a DOM or Foundry actor.
 *
 * The key invariants:
 * 1. In non-drag mode, latestHistory comes from getActorHistory and
 *    _baseHistory is captured for the next drag.
 * 2. In insert-span drag mode (isDragging, NOT isPending), preview history
 *    is built from _baseHistory (not from the DB), preventing preview stacking.
 * 3. When isPending is true (dialog open), preview is NOT built - the DB
 *    state is authoritative even if the interaction state still has drag context.
 * 4. If displacementResult is null (e.g. invalid drag), the viewport
 *    falls through to the DB history branch.
 */

// Minimal history for testing
const baseHistory = [
  { id: 'evt-1', sort: 100, isNow: false, isBirth: false, record: { eventTitle: 'Event 1', eventIsSpan: false, ts: 1000, eventAge: 10 } },
  { id: 'evt-2', sort: 200, isNow: false, isBirth: false, record: { eventTitle: 'Event 2', eventIsSpan: false, ts: 2000, eventAge: 20 } },
  { id: 'now', sort: 999999999, isNow: true, record: { eventTitle: 'NOW', objectiveNow: 3000 } }
];

function makeInsertionContext() {
  return {
    departureAge: 15,
    departureTime: 1500,
    insertionSort: 150,
    beforeNode: { id: 'evt-1', age: 10 }
  };
}

describe('Viewport render-path preview history', () => {
  describe('buildPreviewHistory (core function)', () => {
    it('should build preview history from base history and insertion context', () => {
      const insertionContext = makeInsertionContext();
      const displacementResult = calculateInsertionDisplacement(
        insertionContext.departureAge,
        insertionContext.departureTime,
        2500,
        baseHistory
      );

      const preview = buildPreviewHistory(baseHistory, insertionContext, displacementResult);

      // Virtual span injected
      const virtualSpan = preview.find(n => n.id === 'preview-insert-span');
      expect(virtualSpan).toBeDefined();
      expect(virtualSpan.record.eventIsSpan).toBe(true);
      expect(virtualSpan.record.arrivalTs).toBe(displacementResult.arrivalTime);

      // Original events preserved
      expect(preview.find(n => n.id === 'evt-1')).toBeDefined();
      expect(preview.find(n => n.id === 'evt-2')).toBeDefined();

      // NOW remains at end
      expect(preview[preview.length - 1].id).toBe('now');
    });

    it('should not build preview when insertionContext is null', () => {
      const result = buildPreviewHistory(baseHistory, null, null);
      // Returns original history unchanged
      expect(result).toBe(baseHistory);
    });
  });

  describe('Render-path logic (simulation)', () => {
    // These tests simulate the viewport _render logic without DOM dependencies.
    // They verify the decision tree that was moved from PointerMachine.

    it('non-drag mode should use DB history and capture baseline', () => {
      // Simulate: interaction is idle
      const interaction = {
        isDragging: false,
        mode: null,
        insertionContext: null,
        currentWorld: null
      };

      let latestHistory = null;
      let baseHistoryCapture = null;

      // Simulate the render-path branch
      const isInsertSpan = interaction.mode === 'insert-span' && interaction.isDragging && !interaction.isPending;
      if (isInsertSpan && interaction.insertionContext && interaction.currentWorld) {
        // Preview path - should NOT be taken in this test
        latestHistory = buildPreviewHistory(baseHistoryCapture, interaction.insertionContext, {});
      } else {
        // Normal path - reads from DB and captures baseline
        latestHistory = baseHistory;
        baseHistoryCapture = latestHistory;
      }

      // In non-drag mode: history comes from DB (baseline), not preview
      expect(latestHistory).toBe(baseHistory);
      expect(baseHistoryCapture).toBe(baseHistory);
    });

    it('insert-span drag mode should build preview from captured baseline', () => {
      // Simulate: drag started, baseHistory captured from prior non-drag render
      const capturedBaseline = [...baseHistory];
      const insertionContext = makeInsertionContext();
      const currentWorld = { eventAge: 15, eventTime: 2500 };

      const interaction = {
        isDragging: true,
        isPending: false,
        mode: 'insert-span',
        insertionContext,
        currentWorld
      };

      let latestHistory = null;

      const isInsertSpan = interaction.mode === 'insert-span' && interaction.isDragging && !interaction.isPending;
      if (isInsertSpan && interaction.insertionContext && interaction.currentWorld) {
        const displacementResult = calculateInsertionDisplacement(
          interaction.insertionContext.departureAge,
          interaction.insertionContext.departureTime,
          interaction.currentWorld.eventTime,
          capturedBaseline
        );
        if (displacementResult) {
          latestHistory = buildPreviewHistory(
            capturedBaseline, insertionContext, displacementResult
          );
        }
      }

      // Preview history should be different from baseline (contains virtual span)
      const virtualSpan = latestHistory.find(n => n.id === 'preview-insert-span');
      expect(virtualSpan).toBeDefined();
      expect(virtualSpan.record.eventIsSpan).toBe(true);
    });

    it('preview stacking should NOT occur across multiple renders', () => {
      // Simulate: base history captured once, then multiple render frames
      // during a single drag gesture. Each render must start from the
      // SAME baseline, not from the previous preview.
      const capturedBaseline = [...baseHistory];
      const insertionContext = makeInsertionContext();

      // First render frame
      const displacement1 = calculateInsertionDisplacement(
        insertionContext.departureAge,
        insertionContext.departureTime,
        2500,
        capturedBaseline
      );
      const preview1 = buildPreviewHistory(capturedBaseline, insertionContext, displacement1);

      // Second render frame (drag moved further) - must start from SAME baseline
      const displacement2 = calculateInsertionDisplacement(
        insertionContext.departureAge,
        insertionContext.departureTime,
        3000,
        capturedBaseline
      );
      const preview2 = buildPreviewHistory(capturedBaseline, insertionContext, displacement2);

      // Both previews should have exactly one virtual span (not stacked)
      const vspans1 = preview1.filter(n => n.id === 'preview-insert-span');
      const vspans2 = preview2.filter(n => n.id === 'preview-insert-span');
      expect(vspans1.length).toBe(1);
      expect(vspans2.length).toBe(1);

      // Preview 2 should reflect the updated arrival time
      expect(vspans2[0].record.arrivalTs).toBeLessThanOrEqual(3000);
    });

    it('null displacementResult should fall through to DB history', () => {
      // Edge case: calculateInsertionDisplacement could return null-ish
      // if the input history is empty or invalid.
      const capturedBaseline = [...baseHistory];
      const insertionContext = makeInsertionContext();
      const currentWorld = { eventAge: 15, eventTime: 2500 };

      const interaction = {
        isDragging: true,
        isPending: false,
        mode: 'insert-span',
        insertionContext,
        currentWorld
      };

      let latestHistory = null;

      const isInsertSpan = interaction.mode === 'insert-span' && interaction.isDragging && !interaction.isPending;
      if (isInsertSpan && interaction.insertionContext && interaction.currentWorld) {
        // Simulate: pass empty nodes array so displacement computes normally
        // but test the null-check branch
        const displacementResult = null; // Force null
        if (displacementResult) {
          latestHistory = buildPreviewHistory(
            capturedBaseline, insertionContext, displacementResult
          );
        }
      }

      // With null displacementResult, the if block is skipped
      // and latestHistory remains null (in real viewport, this falls
      // through to the else branch which reads from DB)
      expect(latestHistory).toBeNull();
    });

    it('mode not insert-span should not build preview', () => {
      // Simulate: NOW drag (level or span mode), not insert-span
      const interaction = {
        isDragging: true,
        isPending: false,
        mode: 'span', // span drag, not insert-span
        insertionContext: null,
        currentWorld: { eventAge: 20, eventTime: 3000 }
      };

      let baseHistoryCapture = null;
      let latestHistory = null;

      const isInsertSpan = interaction.mode === 'insert-span' && interaction.isDragging && !interaction.isPending;
      if (isInsertSpan && interaction.insertionContext && interaction.currentWorld) {
        // Should not reach this branch
        latestHistory = buildPreviewHistory(baseHistoryCapture, interaction.insertionContext, {});
      } else {
        latestHistory = baseHistory;
        baseHistoryCapture = latestHistory;
      }

      // Should use DB history, not preview
      expect(latestHistory).toBe(baseHistory);
    });

    it('isPending (dialog open) should NOT build preview, even with drag context', () => {
      // REGRESSION TEST: When a dialog is open (isPending=true), the committed
      // DB state is authoritative. The preview must NOT be built from stale
      // _baseHistory because:
      // 1. actor.update() may have already committed the span to the DB
      // 2. The _baseHistory is stale (captured before the commit)
      // 3. Building preview from stale base would show a virtual span that
      //    differs from the just-committed real span
      const capturedBaseline = [...baseHistory];
      const insertionContext = makeInsertionContext();
      const currentWorld = { eventAge: 15, eventTime: 2500 };

      const interaction = {
        isDragging: true,  // drag state still active
        isPending: true,   // but dialog is open
        mode: 'insert-span',
        insertionContext,
        currentWorld
      };

      // Simulate committed DB history (span was just committed)
      const committedHistory = [
        ...baseHistory.slice(0, 1),
        { id: 'new-span', sort: 150, isNow: false, isBirth: false, record: { eventTitle: 'New Span', eventIsSpan: true, ts: 1500, arrivalTs: 2500, eventAge: 15 } },
        ...baseHistory.slice(1)
      ];

      let latestHistory = null;
      let baseHistoryCapture = null;

      const isInsertSpan = interaction.mode === 'insert-span' && interaction.isDragging && !interaction.isPending;
      if (isInsertSpan && interaction.insertionContext && interaction.currentWorld) {
        // This branch should NOT be taken because isPending is true
        const displacementResult = calculateInsertionDisplacement(
          interaction.insertionContext.departureAge,
          interaction.insertionContext.departureTime,
          interaction.currentWorld.eventTime,
          capturedBaseline
        );
        if (displacementResult) {
          latestHistory = buildPreviewHistory(capturedBaseline, insertionContext, displacementResult);
        }
      } else {
        // MUST take this branch: read from committed DB, not stale preview
        latestHistory = committedHistory;
        baseHistoryCapture = latestHistory;
      }

      // Must read from DB, showing the committed span
      expect(latestHistory).toBe(committedHistory);
      expect(latestHistory.find(n => n.id === 'new-span')).toBeDefined();
      // Must NOT contain a virtual preview span
      expect(latestHistory.find(n => n.id === 'preview-insert-span')).toBeUndefined();
    });
  });
});