import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpanGraphViewport } from '../../modules/span-graph/viewport.js';

describe('Viewport Navigation', () => {
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

  it('should update pan state on manual handlePan', () => {
    viewport.setViewState({ panX: 0, panY: 0 });
    viewport.handlePan(50, 50);
    
    const state = viewport.getViewState();
    expect(state.panX).toBe(50);
    expect(state.panY).toBe(50);
  });

  it('should update zoom factor on handleZoom', () => {
    viewport.setViewState({ zoom: 1 });
    viewport.handleZoom(1.1); // Zoom in factor
    
    const state = viewport.getViewState();
    expect(state.zoom).toBe(1.1);
  });
});
