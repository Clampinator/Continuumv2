import { describe, it, expect, vi } from 'vitest';
import { RailRenderer } from '../../modules/span-graph/renderers/rail-renderer.js';

describe('RailRenderer', () => {
  const mockViewport = {
    worldToScreen: vi.fn((age, time) => ({ x: age, y: time })),
    svg: {
      appendChild: vi.fn()
    }
  };

  if (typeof global.document === 'undefined') {
    global.document = {
      createElementNS: vi.fn(() => ({
        setAttribute: vi.fn(),
        classList: { add: vi.fn() },
        style: {}
      }))
    };
  }

  it('should generate SVG path segments for temporal epochs', () => {
    const segments = [
      { startAge: 0, startTime: 1000, events: [
        { age: 0, time: 1000 },
        { age: 10, time: 11000 }
      ]},
      { startAge: 10, startTime: 50000, events: [
        { age: 10, time: 50000, isSpan: true },
        { age: 20, time: 60000 }
      ]}
    ];

    const renderer = new RailRenderer(mockViewport);
    renderer.render(segments);

    // Should create a path for each segment
    expect(document.createElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'path');
    expect(mockViewport.svg.appendChild).toHaveBeenCalled();
  });
});
