import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GridRenderer } from '../../modules/span-graph/renderers/grid-renderer.js';

describe('GridRenderer', () => {
  let viewport;
  let gridRenderer;

  if (typeof global.document === 'undefined') {
    global.document = {
      createElementNS: vi.fn(() => ({
        setAttribute: vi.fn(),
        style: {},
        appendChild: vi.fn()
      }))
    };
  }

  beforeEach(() => {
    viewport = {
      svg: {
        appendChild: vi.fn(),
        prepend: vi.fn()
      },
      viewState: { zoom: 1, panX: 0, panY: 0 },
      container: { clientWidth: 1000, clientHeight: 500 }
    };
    gridRenderer = new GridRenderer(viewport);
  });

  it('should create a grid group in the SVG', () => {
    expect(viewport.svg.prepend).toHaveBeenCalled();
  });

  it('should determine correct grid intervals based on zoom', () => {
    // Zoom 1: Expect large intervals (e.g. Years)
    const interval1 = gridRenderer.getInterval(1);
    expect(interval1).toBeGreaterThan(1000);

    // Zoom 100: Expect small intervals (e.g. Days or Hours)
    const interval100 = gridRenderer.getInterval(100);
    expect(interval100).toBeLessThan(interval1);
  });
});
