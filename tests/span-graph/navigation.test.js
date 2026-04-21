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
      addEventListener: vi.fn()
    }))
  };
}

describe('Viewport Navigation', () => {
  let container;
  let viewport;

  beforeEach(() => {
    container = {
      appendChild: vi.fn(),
      addEventListener: vi.fn()
    };
    viewport = new SpanGraphViewport(container);
  });

  it('should update pan state on click-and-drag', () => {
    // We can't easily trigger real mouse events in Node, 
    // but we can test the internal handlers directly once exposed.
    // For now, we define the expected method signatures.
    expect(viewport.handlePan).toBeDefined();
    
    viewport.setViewState({ panX: 0, panY: 0 });
    viewport.handlePan(10, 20); // Simulated movement delta
    
    const state = viewport.getViewState();
    expect(state.panX).toBe(10);
    expect(state.panY).toBe(20);
  });

  it('should update zoom state on wheel event', () => {
    expect(viewport.handleZoom).toBeDefined();
    
    viewport.setViewState({ zoom: 1 });
    viewport.handleZoom(1.1); // Zoom in factor
    
    const state = viewport.getViewState();
    expect(state.zoom).toBe(1.1);
  });

  it('should zoom relative to a specific anchor point (cursor)', () => {
    viewport.setViewState({ panX: 0, panY: 0, zoom: 1 });
    
    // Zoom in (2x) at anchor (100, 100)
    // New Pan = Anchor - (Anchor - OldPan) * (NewZoom / OldZoom)
    // New Pan = 100 - (100 - 0) * 2 = -100
    viewport.handleZoom(2, { x: 100, y: 100 });
    
    const state = viewport.getViewState();
    expect(state.zoom).toBe(2);
    expect(state.panX).toBe(-100);
    expect(state.panY).toBe(-100);
  });
});
