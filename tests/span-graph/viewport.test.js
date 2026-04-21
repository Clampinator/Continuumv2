import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpanGraphViewport } from '../../modules/span-graph/viewport.js';

// Minimal DOM mock for Node environment
if (typeof global.document === 'undefined') {
  global.document = {
    createElementNS: vi.fn(() => ({
      setAttribute: vi.fn(),
      style: {},
      appendChild: vi.fn(),
      prepend: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  };
}

describe('SpanGraphViewport', () => {
  let container;
  let viewport;

  beforeEach(() => {
    container = {
      appendChild: vi.fn()
    };
  });

  it('should create an SVG element within the container', () => {
    viewport = new SpanGraphViewport(container);
    expect(viewport.svg).not.toBeNull();
    expect(document.createElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'svg');
    expect(container.appendChild).toHaveBeenCalled();
  });

  it('should initialize with a default view state', () => {
    viewport = new SpanGraphViewport(container);
    const state = viewport.getViewState();
    expect(state.panX).toBe(0);
    expect(state.panY).toBe(0);
    expect(state.zoom).toBe(1);
  });

  it('should project world coordinates to SVG space via the view state', () => {
    viewport = new SpanGraphViewport(container);
    viewport.setViewState({ panX: 100, panY: 200, zoom: 2 });
    
    // Test a point at world (0,0)
    // Screen = (World * Zoom) + Pan
    const screenPoint = viewport.worldToScreen(0, 0);
    expect(screenPoint.x).toBe(100);
    expect(screenPoint.y).toBe(200);

    // Test a point at world (10, 10)
    const screenPoint2 = viewport.worldToScreen(10, 10);
    expect(screenPoint2.x).toBe(120); // 10*2 + 100
    expect(screenPoint2.y).toBe(220); // 10*2 + 200
  });

  it('should project SVG coordinates back to world space', () => {
    viewport = new SpanGraphViewport(container);
    viewport.setViewState({ panX: 100, panY: 200, zoom: 2 });

    // World = (Screen - Pan) / Zoom
    const worldPoint = viewport.screenToWorld(120, 220);
    expect(worldPoint.age).toBe(10);
    expect(worldPoint.time).toBe(10);
  });
});
