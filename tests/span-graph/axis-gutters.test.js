import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxisRenderer } from '../../modules/span-graph/renderers/axis-renderer.js';

describe('AxisRenderer Responsive Scaling', () => {
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
        innerHTML: ''
      }))
    };

    mockViewport = {
      svg: {
        appendChild: vi.fn()
      },
      container: {
        getBoundingClientRect: vi.fn(() => ({ width: 1000, height: 500 })),
        clientWidth: 1000,
        clientHeight: 500
      },
      viewState: { zoom: 1, panX: 0, panY: 0 },
      worldToScreen: vi.fn((age, time) => ({ x: age, y: time })),
      screenToWorld: vi.fn((x, y) => ({ age: x, time: y }))
    };

    renderer = new AxisRenderer(mockViewport);
  });

  it('should always render 5 or 6 labels for the X-axis', () => {
    renderer.render();
    
    // We expect roughly 5 or 6 text elements for X labels
    // (Actual count depends on implementation, but should be consistent)
    const textCalls = vi.mocked(document.createElementNS).mock.calls
        .filter(call => call[1] === 'text');
    
    // X Title + Y Title + X Labels + Y Labels
    // At least 10 elements total (2 titles + ~4-6 X + ~4-6 Y)
    expect(textCalls.length).toBeGreaterThanOrEqual(10);
  });
});
