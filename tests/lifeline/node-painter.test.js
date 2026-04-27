import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateNodes } from '../../modules/lifeline/painters/node-painter/update-nodes.js';

// Mock createNodeShape
vi.mock('../../modules/lifeline/painters/node-painter/create-node-shape.js', () => ({
  createNodeShape: vi.fn((node, cx, cy) => {
    return {
      setAttribute: vi.fn(),
      classList: { add: vi.fn() },
      style: {},
      tagName: 'mock-shape',
      dataset: {}
    };
  })
}));

// Mock updateNowNode, updateInsertGhost, updateYetNodes to prevent DOM errors
vi.mock('../../modules/lifeline/painters/node-painter/update-now-node.js', () => ({
    updateNowNode: vi.fn()
}));
vi.mock('../../modules/lifeline/painters/node-painter/update-insert-ghost.js', () => ({
    updateInsertGhost: vi.fn()
}));
vi.mock('../../modules/lifeline/painters/node-painter/update-yet-nodes.js', () => ({
    updateYetNodes: vi.fn()
}));

import { createNodeShape } from '../../modules/lifeline/painters/node-painter/create-node-shape.js';

describe('NodePainter updateNodes', () => {
  let mockGroup;
  let mockViewState;

  beforeEach(() => {
    mockGroup = {
      innerHTML: '',
      appendChild: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      querySelector: vi.fn(() => null)
    };

    mockViewState = {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1
    };

    vi.clearAllMocks();
  });

  it('should use eventAge and eventTime standard for coordinates', () => {
    const graphData = {
      levelNodes: [
        { eventAge: 100, eventTime: 1000 }
      ]
    };

    updateNodes(mockGroup, mockViewState, graphData);

    expect(createNodeShape).toHaveBeenCalledWith(
        expect.objectContaining({ eventAge: 100 }),
        100, // cx
        1000 // cy
    );
  });

  it('should render dual nodes for spans (origin and destination)', () => {
    const graphData = {
      levelNodes: [
        { 
          eventAge: 150, 
          eventTime: 2000, 
          eventIsSpan: true, 
          arrivalY: 8000 
        }
      ]
    };

    updateNodes(mockGroup, mockViewState, graphData);

    // Should call createNodeShape twice for a single span event
    expect(createNodeShape).toHaveBeenCalledTimes(2);

    // First call: Span Origin
    expect(createNodeShape).toHaveBeenNthCalledWith(1, 
        expect.objectContaining({ type: 'span-origin-up' }),
        150, // cx
        2000 // cy (departure)
    );

    // Second call: Span Destination
    expect(createNodeShape).toHaveBeenNthCalledWith(2, 
        expect.objectContaining({ type: 'span-dest-up' }),
        150, // cx
        8000 // arrivalCy
    );
  });
});
