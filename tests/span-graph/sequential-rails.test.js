import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RailRenderer } from '../../modules/span-graph/renderers/rail-renderer.js';

describe('Sequential Rail Rendering', () => {
  let mockViewport;
  let renderer;

  beforeEach(() => {
    global.document = {
      createElementNS: vi.fn((ns, tag) => ({
        setAttribute: vi.fn(),
        style: {},
        appendChild: vi.fn(),
        tagName: tag,
        classList: { add: vi.fn() }
      })),
      createDocumentFragment: vi.fn(() => ({
          appendChild: vi.fn()
      }))
    };

    mockViewport = {
      svg: { appendChild: vi.fn() },
      worldToScreen: vi.fn((age, time) => ({ x: age, y: time })),
      viewState: { zoom: 1, panX: 0, panY: 0 }
    };

    renderer = new RailRenderer(mockViewport);
  });

  it('should create separate path elements for segments and spans', () => {
    const state = {
      events: [
        { age: 0, projectedTime: 0, id: 'e1' },
        { age: 100, projectedTime: 100, id: 'e2' }
      ],
      segments: [
        {
          arrivalPoint: { age: 0, projectedTime: 0, id: 'arrival-0' },
          events: [{ age: 50, projectedTime: 50, id: 'e1' }],
          exitPoint: { age: 100, projectedTime: 100, id: 'span1' }
        },
        {
          arrivalPoint: { age: 100, projectedTime: 500, id: 'arrival-1' },
          events: [{ age: 150, projectedTime: 550, id: 'e2' }]
        }
      ],
      nowNode: { age: 200, projectedTime: 600 }
    };

    renderer.render(state);

    const pathCalls = vi.mocked(document.createElementNS).mock.calls
        .filter(call => call[1] === 'path');
    
    // 1 rail + 1 span + 1 log line
    expect(pathCalls.length).toBeGreaterThanOrEqual(2);
  });
});
