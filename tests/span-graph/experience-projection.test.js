import { describe, it, expect } from 'vitest';
import { generateManifest } from '../../modules/span-graph/projection/manifest-generator.js';

/**
 * Mock viewport that mimics SpanGraphViewport.worldToScreen.
 * Uses a simple linear transform: x = (worldAge * scale) + panX
 * so tests can verify projection math without a real SVG viewport.
 */
function createMockViewport(panX = 0, panY = 0, zoom = 0.1) {
  return {
    worldToScreen: (x, y) => ({
      x: (x * zoom) + panX,
      y: (y * zoom * 0.001) + panY
    }),
    viewState: { panX, panY, zoom },
    container: { getBoundingClientRect: () => ({ width: 800, height: 600 }) }
  };
}

function createMockState(experiences = []) {
  return {
    segments: [],
    nodes: [],
    experiences,
    eras: []
  };
}

describe('Manifest Generator: Experience Projection', () => {
  it('should project state.experiences into manifest.experiences with screen coordinates', () => {
    // An experience spanning 0-100 seconds age, with object time range
    const state = createMockState([{
      id: 'exp1',
      name: 'Test Experience',
      eraId: 'era1',
      startAge: 0,
      endAge: 100,
      startTime: 1577836800000,
      endTime: 1577836900000,
      isOngoing: false,
      isClosed: true,
      opacity: 0.8,
      bonus: 3
    }]);

    const viewport = createMockViewport();
    const manifest = generateManifest(state, viewport);

    // The projection step must have produced at least one experience
    expect(manifest.experiences).toHaveLength(1);
    const projected = manifest.experiences[0];

    // Screen coordinates must be computed (not undefined/null)
    expect(projected.id).toBe('exp1');
    expect(projected.name).toBe('Test Experience');
    expect(projected.x).toBeDefined();
    expect(projected.y).toBeDefined();
    expect(projected.width).toBeDefined();
    expect(projected.height).toBeDefined();

    // Width must be non-negative (projection clamps with Math.max(0, ...))
    expect(projected.width).toBeGreaterThanOrEqual(0);
    expect(projected.height).toBeGreaterThanOrEqual(0);

    // Domain properties must pass through unchanged for the renderer
    expect(projected.isOngoing).toBe(false);
    expect(projected.isClosed).toBe(true);
    expect(projected.opacity).toBe(0.8);
    expect(projected.bonus).toBe(3);
  });

  it('should return empty experiences array when state has no experiences', () => {
    const state = createMockState();
    const viewport = createMockViewport();
    const manifest = generateManifest(state, viewport);
    expect(manifest.experiences).toEqual([]);
  });

  it('should project ongoing experience with isOngoing preserved', () => {
    const state = {
      segments: [],
      nodes: [{ id: 'now', x: 500, y: 1600000000000 }],
      experiences: [{
        id: 'exp2',
        name: 'Ongoing',
        eraId: 'era1',
        startAge: 100,
        endAge: 500,
        startTime: 1577836800000,
        endTime: 1600000000000,
        isOngoing: true,
        isClosed: false,
        opacity: 1.0,
        bonus: 3
      }],
      eras: []
    };

    const viewport = createMockViewport();
    const manifest = generateManifest(state, viewport);

    expect(manifest.experiences).toHaveLength(1);
    expect(manifest.experiences[0].isOngoing).toBe(true);
    expect(manifest.experiences[0].opacity).toBe(1.0);
  });

  it('should handle empty manifest when state is null', () => {
    const viewport = createMockViewport();
    const manifest = generateManifest(null, viewport);
    expect(manifest.experiences).toEqual([]);
  });

  it('should project multiple experiences preserving order', () => {
    const state = createMockState([
      { id: 'a', name: 'First', eraId: 'e1', startAge: 0, endAge: 10, startTime: 1000, endTime: 2000, isOngoing: false, isClosed: true, opacity: 0.5, bonus: 1 },
      { id: 'b', name: 'Second', eraId: 'e1', startAge: 5, endAge: 15, startTime: 1500, endTime: 2500, isOngoing: false, isClosed: true, opacity: 0.3, bonus: 2 }
    ]);

    const viewport = createMockViewport();
    const manifest = generateManifest(state, viewport);

    expect(manifest.experiences).toHaveLength(2);
    expect(manifest.experiences[0].id).toBe('a');
    expect(manifest.experiences[1].id).toBe('b');
  });

  it('should project upward experience (endTime < startTime) with correct screen box', () => {
    // When endTime < startTime, the experience extends upward on the graph.
    // The manifest generator must still produce a valid screen-space bounding
    // box with non-negative width and height via Math.abs/Math.min.
    const state = createMockState([{
      id: 'exp1',
      name: 'Upward Exp',
      eraId: 'era1',
      startAge: 0,
      endAge: 100,
      // startTime > endTime: character spanned backward in objective time
      startTime: 2000,
      endTime: 1000,
      isOngoing: false,
      isClosed: true,
      opacity: 0.8,
      bonus: 1
    }]);

    const viewport = createMockViewport();
    const manifest = generateManifest(state, viewport);

    expect(manifest.experiences).toHaveLength(1);
    const projected = manifest.experiences[0];

    // Height must be non-negative even when endTime < startTime
    expect(projected.height).toBeGreaterThanOrEqual(0);
    expect(projected.width).toBeGreaterThanOrEqual(0);
    // Domain properties pass through
    expect(projected.isClosed).toBe(true);
    expect(projected.opacity).toBe(0.8);
  });

  it('should project upward ongoing experience with valid bounding box', () => {
    // Ongoing experience where NOW is above the start (character spanned back)
    const state = createMockState([{
      id: 'exp2',
      name: 'Upward Ongoing',
      eraId: 'era1',
      startAge: 10,
      endAge: 50,
      startTime: 1600000000000,
      endTime: 1500000000000,
      isOngoing: true,
      isClosed: false,
      opacity: 1.0,
      bonus: 3
    }]);

    const viewport = createMockViewport();
    const manifest = generateManifest(state, viewport);

    expect(manifest.experiences).toHaveLength(1);
    expect(manifest.experiences[0].height).toBeGreaterThanOrEqual(0);
    expect(manifest.experiences[0].width).toBeGreaterThanOrEqual(0);
    expect(manifest.experiences[0].isOngoing).toBe(true);
  });
});