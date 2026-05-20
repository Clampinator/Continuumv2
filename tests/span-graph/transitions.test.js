import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpanGraphViewport } from '../../modules/span-graph/viewport.js';

describe('Animated Transitions', () => {
  let viewport;
  let container;

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
        getBoundingClientRect: vi.fn(() => ({ width: 1000, height: 500 })),
        classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
        dataset: {}
      }))
    };

    container = {
      appendChild: vi.fn(),
      addEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 1000, height: 500 }))
    };

    viewport = new SpanGraphViewport(container);
    // Ensure ALL viewState values are numbers to prevent NaN during interpolation
    viewport.viewState.panX = 0;
    viewport.viewState.panY = 0;
    viewport.viewState.zoom = 1;
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn(callback => setTimeout(() => callback(performance.now()), 0));
  });

  it('should support animated view state updates', async () => {
    // Animate to a new position
    const animation = viewport.animateViewState({ panX: 100 }, 10); 
    
    expect(animation).toBeInstanceOf(Promise);
    await animation;
    
    expect(viewport.getViewState().panX).toBe(100);
  });
});
