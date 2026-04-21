import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpanGraphViewport } from '../../modules/span-graph/viewport.js';
import { TARGET_RATIO } from '../../modules/temporal-engine/constants.js';

describe('SpanGraphViewport', () => {
  let container;
  let viewport;

  beforeEach(() => {
    // Basic DOM setup
    global.document = {
      createElementNS: vi.fn(() => ({
        setAttribute: vi.fn(),
        style: {},
        appendChild: vi.fn(),
        prepend: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getBoundingClientRect: vi.fn(() => ({ width: 1000, height: 500 }))
      }))
    };

    container = {
      appendChild: vi.fn(),
      addEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 1000, height: 500 }))
    };

    viewport = new SpanGraphViewport(container);
  });

  it('should initialize with a default view state', () => {
    const state = viewport.getViewState();
    expect(state.zoom).toBe(0.1); // New default
    expect(state.panX).toBe(50);
  });

  it('should project world coordinates to SVG space via the view state', () => {
    // Set a known state for math testing
    viewport.setViewState({ panX: 100, panY: 200, zoom: 1 });
    
    // ScreenX = (Age * Zoom) + PanX
    // ScreenY = (Time * TARGET_RATIO * Zoom) + PanY
    const age = 10;
    const time = 10;
    const screenPoint = viewport.worldToScreen(age, time);
    
    expect(screenPoint.x).toBe(100 + 10 * 1);
    expect(screenPoint.y).toBe(200 + 10 * TARGET_RATIO * 1);
  });

  it('should project SVG coordinates back to world space', () => {
    viewport.setViewState({ panX: 100, panY: 200, zoom: 1 });

    const screenX = 110;
    const screenY = 200 + (10 * TARGET_RATIO);
    
    const worldPoint = viewport.screenToWorld(screenX, screenY);
    expect(worldPoint.age).toBe(10);
    expect(worldPoint.time).toBeCloseTo(10, 5);
  });
});
