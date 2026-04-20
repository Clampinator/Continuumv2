import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RailRenderer } from '../../modules/span-graph/renderers/rail-renderer.js';

// Minimal DOM mock for Node environment
if (typeof global.document === 'undefined') {
  global.document = {
    createElementNS: vi.fn(() => ({
      setAttribute: vi.fn(),
      style: {},
      appendChild: vi.fn()
    })),
    createDocumentFragment: vi.fn(() => ({
      appendChild: vi.fn()
    }))
  };
}

describe('High-Volume Performance', () => {
  let viewport;
  let renderer;

  beforeEach(() => {
    viewport = {
      worldToScreen: vi.fn((age, time) => ({ x: age, y: time })),
      svg: {
        appendChild: vi.fn()
      }
    };
    renderer = new RailRenderer(viewport);
  });

  it('should handle rendering 1000+ events without error', () => {
    const segments = [
      {
        startAge: 0,
        startTime: 0,
        events: Array.from({ length: 1100 }, (_, i) => ({
          id: `e${i}`,
          age: i,
          time: i * 1000
        }))
      }
    ];

    const startTime = performance.now();
    renderer.render(segments);
    const duration = performance.now() - startTime;

    // Sanity check: Should at least run within a reasonable time for a mock (e.g. 50ms)
    // Real browser performance will differ.
    expect(duration).toBeLessThan(100);
    expect(viewport.svg.appendChild).toHaveBeenCalled();
  });
});
