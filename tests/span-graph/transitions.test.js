import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpanGraphViewport } from '../../modules/span-graph/viewport.js';

describe('Animated Transitions', () => {
  let viewport;
  let container;

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

  beforeEach(() => {
    container = { appendChild: vi.fn(), addEventListener: vi.fn() };
    viewport = new SpanGraphViewport(container);

    // Mock requestAnimationFrame to execute immediately
    global.requestAnimationFrame = vi.fn(callback => {
        callback(performance.now() + 100); // Simulate some time passed
    });
  });

  it('should support animated view state updates', async () => {
    // This requires a mock for requestAnimationFrame if testing timing
    // For now, we verify the presence of the API
    expect(viewport.animateViewState).toBeDefined();
    
    viewport.setViewState({ panX: 0, panY: 0 });
    
    // Animate to a new position
    const animation = viewport.animateViewState({ panX: 100 }, 100);
    
    expect(animation).toBeInstanceOf(Promise);
    await animation;
    
    expect(viewport.getViewState().panX).toBe(100);
  });
});
