import { describe, it, expect } from 'vitest';
import { calculateAutofocus } from '../../modules/temporal-engine/calculate-autofocus.js';
import { SECONDS_IN_YEAR } from '../../modules/temporal-engine/constants.js';

const TARGET_RATIO = -0.00057735;
const BIRTH_ONLY_VISIBLE_YEARS = 25;

function birthOnlyZoom(containerWidth) {
  return containerWidth / (BIRTH_ONLY_VISIBLE_YEARS * SECONDS_IN_YEAR);
}

function makeState(nodes) {
  return { nodes };
}

const ORIGIN_TIME = 946684800000;

describe('calculateAutofocus', () => {
  // GUARD: null/empty state returns null
  it('returns null when latestState is null', () => {
    expect(calculateAutofocus(null, 800, 600)).toBeNull();
  });

  it('returns null when nodes is empty', () => {
    expect(calculateAutofocus({ nodes: [] }, 800, 600)).toBeNull();
  });

  // GUARD: zero-width container returns null
  it('returns null when containerWidth is 0', () => {
    const state = makeState([
      { id: 'birth', isBirth: true, x: 0, y: ORIGIN_TIME }
    ]);
    expect(calculateAutofocus(state, 0, 600)).toBeNull();
  });

  it('returns null when containerWidth is negative', () => {
    const state = makeState([
      { id: 'birth', isBirth: true, x: 0, y: ORIGIN_TIME }
    ]);
    expect(calculateAutofocus(state, -1, 600)).toBeNull();
  });

  describe('Case 1: Birth-only character', () => {
    it('positions birth node in lower-left quadrant showing 25 years across X-axis', () => {
      const birthNode = { id: 'birth', isBirth: true, x: 0, y: ORIGIN_TIME };
      const nowNode = { id: 'now', isNow: true, x: 0, y: ORIGIN_TIME };
      const state = makeState([birthNode, nowNode]);

      const containerWidth = 800;
      const containerHeight = 600;
      const expectedZoom = birthOnlyZoom(containerWidth);
      const result = calculateAutofocus(state, containerWidth, containerHeight);

      expect(result.zoom).toBeCloseTo(expectedZoom, 10);
      expect(result.initialized).toBe(true);

      // Birth at origin should map to (25% width, 75% height)
      const screenX = (0 * result.zoom) + result.panX;
      const screenY = (ORIGIN_TIME * TARGET_RATIO * result.zoom) + result.panY;
      expect(screenX).toBeCloseTo(containerWidth * 0.25, 0);
      expect(screenY).toBeCloseTo(containerHeight * 0.75, 0);
    });

    it('visible age range spans exactly 25 years', () => {
      const birthNode = { id: 'birth', isBirth: true, x: 0, y: ORIGIN_TIME };
      const nowNode = { id: 'now', isNow: true, x: 0, y: ORIGIN_TIME };
      const state = makeState([birthNode, nowNode]);

      const result = calculateAutofocus(state, 800, 600);

      const visibleAgeSeconds = 800 / result.zoom;
      const visibleAgeYears = visibleAgeSeconds / SECONDS_IN_YEAR;
      expect(visibleAgeYears).toBeCloseTo(25, 0);
    });
  });

  describe('Case 2: Character with history nodes', () => {
    it('centers midpoint of bounding box and fits content with padding', () => {
      const birthNode = { id: 'birth', isBirth: true, x: 0, y: ORIGIN_TIME };
      const eventNode = { id: 'event1', x: 31536000, y: ORIGIN_TIME + 31536000000 };
      const nowNode = { id: 'now', isNow: true, x: 63072000, y: ORIGIN_TIME + 63072000000 };
      const state = makeState([birthNode, eventNode, nowNode]);

      const containerWidth = 800;
      const containerHeight = 600;
      const result = calculateAutofocus(state, containerWidth, containerHeight);

      expect(result.initialized).toBe(true);
      expect(result.zoom).toBeGreaterThan(0);

      // Midpoint should be roughly centered on screen
      const midX = (0 + 63072000) / 2;
      const midY = (ORIGIN_TIME + ORIGIN_TIME + 63072000000) / 2;
      const screenMidX = (midX * result.zoom) + result.panX;
      const screenMidY = (midY * TARGET_RATIO * result.zoom) + result.panY;
      expect(screenMidX).toBeCloseTo(containerWidth / 2, 0);
      expect(screenMidY).toBeCloseTo(containerHeight / 2, 0);
    });

    it('floors zoom at 25-year visible width when computed zoom is smaller', () => {
      const birthNode = { id: 'birth', isBirth: true, x: 0, y: 0 };
      const nowNode = { id: 'now', isNow: true, x: 1e12, y: 1e15 };
      const eventNode = { id: 'event1', x: 5e11, y: 5e14 };
      const state = makeState([birthNode, eventNode, nowNode]);

      const containerWidth = 800;
      const minZoom = birthOnlyZoom(containerWidth);
      const result = calculateAutofocus(state, containerWidth, 600);

      expect(result.zoom).toBeCloseTo(minZoom, 10);
    });
  });

  describe('Edge cases', () => {
    it('handles single node gracefully (birth-only path)', () => {
      const birthNode = { id: 'birth', isBirth: true, x: 0, y: ORIGIN_TIME };
      const state = makeState([birthNode]);

      const result = calculateAutofocus(state, 800, 600);

      expect(result).not.toBeNull();
      expect(result.initialized).toBe(true);
    });

    it('returns correct zoom for a 2-node lifeline with birth and now at same position', () => {
      const birthNode = { id: 'birth', isBirth: true, x: 0, y: ORIGIN_TIME };
      const nowNode = { id: 'now', isNow: true, x: 0, y: ORIGIN_TIME };
      const state = makeState([birthNode, nowNode]);

      const result = calculateAutofocus(state, 1000, 800);

      expect(result).not.toBeNull();
      expect(result.zoom).toBeCloseTo(birthOnlyZoom(1000), 10);
    });

    it('works with nodes at arbitrary positions', () => {
      const node1 = { id: 'a', x: 100, y: 1000 };
      const node2 = { id: 'b', x: 200, y: 2000 };
      const node3 = { id: 'c', x: 300, y: 3000 };
      const state = makeState([node1, node2, node3]);

      const result = calculateAutofocus(state, 800, 600);
      expect(result).not.toBeNull();
      expect(result.zoom).toBeGreaterThan(0);
      expect(result.panX).toBeDefined();
      expect(result.panY).toBeDefined();
    });

    it('handles very narrow container (1px wide)', () => {
      const birthNode = { id: 'birth', isBirth: true, x: 0, y: ORIGIN_TIME };
      const nowNode = { id: 'now', isNow: true, x: 0, y: ORIGIN_TIME };
      const state = makeState([birthNode, nowNode]);

      const result = calculateAutofocus(state, 1, 600);
      expect(result).not.toBeNull();
      expect(result.zoom).toBeGreaterThan(0);
    });
  });

  describe('targetRatio parameter', () => {
    it('uses default TARGET_RATIO when not provided', () => {
      const birthNode = { id: 'birth', isBirth: true, x: 0, y: ORIGIN_TIME };
      const nowNode = { id: 'now', isNow: true, x: 0, y: ORIGIN_TIME };
      const state = makeState([birthNode, nowNode]);

      const resultDefault = calculateAutofocus(state, 800, 600);
      const resultExplicit = calculateAutofocus(state, 800, 600, TARGET_RATIO);

      expect(resultDefault.zoom).toBeCloseTo(resultExplicit.zoom, 10);
      expect(resultDefault.panX).toBeCloseTo(resultExplicit.panX, 10);
      expect(resultDefault.panY).toBeCloseTo(resultExplicit.panY, 10);
    });

    it('respects custom targetRatio producing different results', () => {
      const ORIGIN = 946684800000;
      const birthNode = { id: 'birth', isBirth: true, x: 0, y: ORIGIN };
      const eventNode = { id: 'event1', x: SECONDS_IN_YEAR, y: ORIGIN + 31536000000 };
      const nowNode = { id: 'now', isNow: true, x: SECONDS_IN_YEAR * 2, y: ORIGIN + 63072000000 };
      const state = makeState([birthNode, eventNode, nowNode]);

      // Different targetRatios produce different panY and zoom
      const resultA = calculateAutofocus(state, 800, 600, -0.00057735);
      const resultB = calculateAutofocus(state, 800, 600, -0.001);

      expect(resultA.panY).not.toBe(resultB.panY);
      expect(resultA.zoom).not.toBe(resultB.zoom);
    });
  });
});