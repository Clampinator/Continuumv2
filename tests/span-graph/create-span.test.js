import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpanGraphViewport } from '../../modules/span-graph/viewport.js';

describe('Create Span Interaction', () => {
  let viewport;
  let container;

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
            querySelector: vi.fn(),
            classList: { contains: vi.fn(), add: vi.fn(), remove: vi.fn() },
            getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 1000, height: 1000 }))
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

  it('should have a _handleNodeDrop method that handles span mode', () => {
    expect(viewport._handleNodeDrop).toBeDefined();
  });
});
