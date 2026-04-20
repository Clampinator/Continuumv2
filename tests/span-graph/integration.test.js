import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockConstructor = vi.fn();

vi.mock('../../modules/span-graph/viewport.js', () => ({
  SpanGraphViewport: class {
    constructor(container) {
      mockConstructor(container);
    }
    render() {}
    setViewState() {}
  }
}));

// Mock the Temporal Projection Service
vi.mock('../../modules/temporal-engine/get-temporal-state.js', () => ({
  getTemporalState: vi.fn(() => ({ segments: [], events: [], spanPool: {} }))
}));

// Mock the RailRenderer
vi.mock('../../modules/span-graph/renderers/rail-renderer.js', () => ({
  RailRenderer: class {
    render() {}
  }
}));

describe('Character Sheet Integration', () => {
  let actor;
  let html;

  beforeEach(() => {
    actor = {
        id: 'actor1',
        system: {
            eras: []
        }
    };
    
    // Minimal mock for the HTML fragment
    html = {
        find: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({}) // Mocking the .span-graph-container
        })
    };
  });

  it('should initialize the viewport when listeners are activated', async () => {
    const { initializeSpanGraph } = await import('../../modules/span-graph/integration/sheet-handler.js');
    
    initializeSpanGraph(actor, html);
    
    expect(mockConstructor).toHaveBeenCalled();
  });
});
