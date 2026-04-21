import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RailRenderer } from '../../modules/span-graph/renderers/rail-renderer.js';

describe('RailRenderer', () => {
  let mockViewport;
  let renderer;

  beforeEach(() => {
    // Mock the DOM
    global.document = {
      createElementNS: vi.fn((ns, tag) => ({
        setAttribute: vi.fn(),
        style: {},
        appendChild: vi.fn(),
        tagName: tag,
        innerHTML: '',
        classList: { add: vi.fn() }
      })),
      createDocumentFragment: vi.fn(() => ({
          appendChild: vi.fn()
      }))
    };

    mockViewport = {
      svg: {
        appendChild: vi.fn()
      },
      worldToScreen: vi.fn((age, time) => ({ x: age, y: time })),
      viewState: { zoom: 1, panX: 0, panY: 0 }
    };

    renderer = new RailRenderer(mockViewport);
  });

  it('should generate SVG path segments for temporal epochs', () => {
    const state = {
      events: [
        { age: 0, projectedTime: 0, id: 'e1' },
        { age: 100, projectedTime: 100, id: 'e2' }
      ],
      segments: [
        {
          events: [
            { age: 0, projectedTime: 0, id: 'e1' },
            { age: 100, projectedTime: 100, id: 'e2' }
          ]
        }
      ],
      nowNode: { age: 150, projectedTime: 150 }
    };

    renderer.render(state);

    // Should create a path for the segment
    expect(document.createElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'path');
  });
});
