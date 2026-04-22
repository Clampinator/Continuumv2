import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpanGraphViewport } from '../../modules/span-graph/viewport.js';

describe('Ghost Nodes Proximity', () => {
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
        querySelector: vi.fn(() => null),
        classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
        getBoundingClientRect: vi.fn(() => ({ width: 1000, height: 500 })),
        setPointerCapture: vi.fn()
      }))
    };

    container = {
      appendChild: vi.fn(),
      addEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 1000, height: 500 })),
      clientWidth: 1000,
      clientHeight: 500
    };

    viewport = new SpanGraphViewport(container);
  });

  it('should calculate distance to segment correctly', () => {
    const p = { x: 10, y: 10 };
    const v = { x: 0, y: 0 };
    const w = { x: 20, y: 0 };
    
    const dist = viewport._distToSegment(p, v, w);
    expect(dist).toBe(10);
  });
});
