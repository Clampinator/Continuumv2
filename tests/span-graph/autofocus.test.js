import { describe, it, expect } from 'vitest';

import { handleAutofocus } from '../../modules/span-graph/viewport/actions/handle-autofocus.js';
import { SECONDS_IN_YEAR } from '../../modules/temporal-engine/constants.js';

const TARGET_RATIO = -0.00057735;
const BIRTH_ONLY_VISIBLE_YEARS = 25;

function birthOnlyZoom(containerWidth) {
  return containerWidth / (BIRTH_ONLY_VISIBLE_YEARS * SECONDS_IN_YEAR);
}

function makeViewport(state, containerWidth = 800, containerHeight = 600) {
  return {
    latestState: state,
    container: {
      getBoundingClientRect: () => ({ width: containerWidth, height: containerHeight })
    }
  };
}

function makeState(nodes) {
  return { nodes };
}

const ORIGIN_TIME = 946684800000;

describe('handleAutofocus', () => {
  // GUARD: null viewport returns null
  it('returns null when viewport is null', () => {
    expect(handleAutofocus(null)).toBeNull();
  });

  // GUARD: null state returns null
  it('returns null when latestState is null', () => {
    expect(handleAutofocus(makeViewport(null))).toBeNull();
  });

  // GUARD: empty nodes returns null
  it('returns null when nodes is empty', () => {
    expect(handleAutofocus(makeViewport(makeState([])))).toBeNull();
  });

  // GUARD: zero-width container returns null
  it('returns null when container has zero width', () => {
    const state = makeState([
      { id: 'birth', isBirth: true, x: 0, y: ORIGIN_TIME }
    ]);
    const result = handleAutofocus(makeViewport(state, 0, 600));
    expect(result).toBeNull();
  });

  describe('Case 1: Birth-only character', () => {
    it('positions birth node in lower-left quadrant showing 25 years across X-axis', () => {
      const birthNode = { id: 'birth', isBirth: true, x: 0, y: ORIGIN_TIME };
      const nowNode = { id: 'now', isNow: true, x: 0, y: ORIGIN_TIME };
      const state = makeState([birthNode, nowNode]);

      const containerWidth = 800;
      const containerHeight = 600;
      const viewport = makeViewport(state, containerWidth, containerHeight);
      const expectedZoom = birthOnlyZoom(containerWidth);
      const result = handleAutofocus(viewport);

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

      const result = handleAutofocus(makeViewport(state, 800, 600));

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
      const result = handleAutofocus(makeViewport(state, containerWidth, containerHeight));

      expect(result.initialized).toBe(true);
      expect(result.zoom).toBeGreaterThan(0);

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

      const minZoom = birthOnlyZoom(800);
      const result = handleAutofocus(makeViewport(state, 800, 600));

      expect(result.zoom).toBeCloseTo(minZoom, 10);
    });
  });

  it('does not crash with single node (birth only, no NOW)', () => {
    const birthNode = { id: 'birth', isBirth: true, x: 0, y: ORIGIN_TIME };
    const state = makeState([birthNode]);

    const result = handleAutofocus(makeViewport(state, 800, 600));

    expect(result).not.toBeNull();
    expect(result.initialized).toBe(true);
  });
});