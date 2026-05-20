import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeSpanGraph } from '../../modules/span-graph/integration/sheet-handler.js';

describe('Character Sheet Integration', () => {
  let actor;
  let html;
  let sheet;

  beforeEach(() => {
    actor = {
      id: 'actor1',
      system: {
        personal: { subjectiveNow: 100 },
        eras: {}
      }
    };

    html = {
      find: vi.fn().mockReturnThis(),
      get: vi.fn(() => ({
        appendChild: vi.fn(),
        getBoundingClientRect: vi.fn(() => ({ width: 1000, height: 500 })),
        addEventListener: vi.fn()
      }))
    };

    sheet = {
        actor
    };

    // Mock DOM globals
    global.document = {
      createElementNS: vi.fn(() => ({
        setAttribute: vi.fn(),
        style: {},
        appendChild: vi.fn(),
        prepend: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getBoundingClientRect: vi.fn(() => ({ width: 1000, height: 500 })),
        classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
        dataset: {}
      })),
      createDocumentFragment: vi.fn(() => ({
          appendChild: vi.fn()
      }))
    };
  });

  it('should initialize the viewport when listeners are activated', () => {
    const viewport = initializeSpanGraph(actor, html, sheet);
    
    expect(viewport).toBeDefined();
    expect(sheet._spanGraphViewport).toBe(viewport);
  });
});
