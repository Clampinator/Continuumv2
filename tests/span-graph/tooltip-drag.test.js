import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpanGraphViewport } from '../../modules/span-graph/viewport.js';

describe('Tooltip Dragging', () => {
  let container;
  let viewport;

  beforeEach(() => {
    // Basic DOM setup for Node
    if (typeof global.document === 'undefined') {
        global.document = {
          createElementNS: vi.fn(() => ({
            setAttribute: vi.fn(),
            style: {},
            appendChild: vi.fn(),
            prepend: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            querySelector: vi.fn()
          }))
        };
    }

    container = {
      appendChild: vi.fn(),
      addEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 1000, height: 1000 }))
    };

    viewport = new SpanGraphViewport(container);
  });

  it('should initialize with a tooltipManager', () => {
    expect(viewport.tooltipManager).toBeDefined();
    expect(viewport.tooltipManager.show).toBeDefined();
    expect(viewport.tooltipManager.hide).toBeDefined();
  });
});
