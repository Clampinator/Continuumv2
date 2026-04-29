import { describe, it, expect, vi } from 'vitest';

vi.mock('../../modules/state/get-actor-history.js', () => ({
  getActorHistory: vi.fn()
}));
vi.mock('../../modules/temporal-engine/get-temporal-state.js', () => ({
  getTemporalState: vi.fn()
}));

import { getActorHistory } from '../../modules/state/get-actor-history.js';
import { getTemporalState } from '../../modules/temporal-engine/get-temporal-state.js';
import { calculateAutofocus } from '../../modules/span-graph/viewport/actions/handle-autofocus.js';

const TARGET_RATIO = -0.00057735;
const BIRTH_ONLY_ZOOM = 0.00000005;

function makeContainer(w = 800, h = 600) {
  return { getBoundingClientRect: () => ({ width: w, height: h }) };
}

function makeActor(subjectiveNow = 0) {
  return { id: 'test', system: { personal: { subjectiveNow, dob: '2000-01-01' } } };
}

describe('calculateAutofocus', () => {
  it('returns null when actor is null', () => {
    expect(calculateAutofocus(null, makeContainer(), () => 0)).toBeNull();
  });

  it('returns null when container is null', () => {
    expect(calculateAutofocus(makeActor(), null, () => 0)).toBeNull();
  });

  it('returns null when container has zero width', () => {
    const c = makeContainer(0, 600);
    expect(calculateAutofocus(makeActor(), c, () => 0)).toBeNull();
  });

  describe('Case 1: Birth-only character', () => {
    it('positions birth node in lower-left quadrant at fixed zoom', () => {
      const originTime = 946684800000;
      const birthNode = { id: 'birth', isBirth: true, x: 0, y: originTime };
      const nowNode = { id: 'now', isNow: true, x: 0, y: originTime };

      getActorHistory.mockReturnValue([]);
      getTemporalState.mockReturnValue({ nodes: [birthNode, nowNode], nowNode });

      const container = makeContainer(800, 600);
      const result = calculateAutofocus(makeActor(), container, () => originTime);

      expect(result.zoom).toBe(BIRTH_ONLY_ZOOM);
      expect(result.initialized).toBe(true);

      // Birth at x=0, y=originTime should map to (25% width, 75% height)
      const screenX = (birthNode.x * result.zoom) + result.panX;
      const screenY = (birthNode.y * TARGET_RATIO * result.zoom) + result.panY;
      expect(screenX).toBeCloseTo(200, 0);
      expect(screenY).toBeCloseTo(450, 0);
    });
  });

  describe('Case 2: Character with history nodes', () => {
    it('centers midpoint of bounding box and fits content with padding', () => {
      const originTime = 946684800000;
      const birthNode = { id: 'birth', isBirth: true, x: 0, y: originTime };
      const eventNode = { id: 'event1', x: 31536000, y: originTime + 31536000000 };
      const nowNode = { id: 'now', isNow: true, x: 63072000, y: originTime + 63072000000 };

      getActorHistory.mockReturnValue([birthNode, eventNode, nowNode]);
      getTemporalState.mockReturnValue({ nodes: [birthNode, eventNode, nowNode], nowNode });

      const container = makeContainer(800, 600);
      const result = calculateAutofocus(makeActor(), container, () => originTime);

      expect(result.initialized).toBe(true);
      expect(result.zoom).toBeGreaterThan(0);

      // Verify midpoint is at screen center
      const midX = (0 + 63072000) / 2;
      const midY = (originTime + originTime + 63072000000) / 2;
      const screenMidX = (midX * result.zoom) + result.panX;
      const screenMidY = (midY * TARGET_RATIO * result.zoom) + result.panY;
      expect(screenMidX).toBeCloseTo(400, 0);
      expect(screenMidY).toBeCloseTo(300, 0);
    });

    it('floors zoom at BIRTH_ONLY_ZOOM when computed zoom is smaller', () => {
      const originTime = 946684800000;
      // Enormous ranges that would produce a zoom smaller than the floor
      const birthNode = { id: 'birth', isBirth: true, x: 0, y: 0 };
      const nowNode = { id: 'now', isNow: true, x: 1e12, y: 1e15 };
      const eventNode = { id: 'event1', x: 5e11, y: 5e14 };

      getActorHistory.mockReturnValue([birthNode, eventNode, nowNode]);
      getTemporalState.mockReturnValue({ nodes: [birthNode, eventNode, nowNode], nowNode });

      const container = makeContainer(800, 600);
      const result = calculateAutofocus(makeActor(), container, () => 0);

      expect(result.zoom).toBe(BIRTH_ONLY_ZOOM);
    });
  });

  it('does not crash with single node (birth only, no NOW)', () => {
    const originTime = 946684800000;
    const birthNode = { id: 'birth', isBirth: true, x: 0, y: originTime };

    getActorHistory.mockReturnValue([]);
    getTemporalState.mockReturnValue({ nodes: [birthNode], nowNode: null });

    const container = makeContainer(800, 600);
    const result = calculateAutofocus(makeActor(), container, () => originTime);

    expect(result).not.toBeNull();
    expect(result.initialized).toBe(true);
  });
});