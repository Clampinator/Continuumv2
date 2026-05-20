import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodeRenderer } from '../../modules/span-graph/renderers/node-renderer.js';

describe('NodeRenderer Shapes', () => {
  let mockViewport;
  let renderer;

  beforeEach(() => {
    // Mock DOM globals
    global.document = {
      createElementNS: vi.fn((ns, tag) => {
        const el = {
          setAttribute: vi.fn(),
          classList: { add: vi.fn(), contains: vi.fn() },
          style: {},
          dataset: {},
          tagName: tag
        };
        return el;
      })
    };

    mockViewport = {
      svg: { appendChild: vi.fn() },
      worldToScreen: vi.fn((age, time) => ({ x: age, y: time }))
    };

    renderer = new NodeRenderer(mockViewport);
  });

  it('should create a polygon for span-origin nodes', () => {
    const event = { id: 'e1', isSpan: true, isSpanOrigin: true, type: 'span-origin-up' };
    const pos = { x: 100, y: 100 };
    
    const node = renderer._createNodeElement(event, pos);
    
    expect(node.tagName).toBe('polygon');
    expect(node.classList.add).toHaveBeenCalledWith('graph-node-span-origin');
  });

  it('should create a path for span-dest nodes', () => {
    const event = { id: 'e2', isSpan: true, isSpanDest: true, type: 'span-dest-up' };
    const pos = { x: 200, y: 200 };
    
    const node = renderer._createNodeElement(event, pos);
    
    expect(node.tagName).toBe('path');
    expect(node.classList.add).toHaveBeenCalledWith('graph-node-span-dest');
  });

  it('should create a circle for normal level nodes', () => {
    const event = { id: 'e3', isSpan: false };
    const pos = { x: 300, y: 300 };
    
    const node = renderer._createNodeElement(event, pos);
    
    expect(node.tagName).toBe('circle');
    expect(node.classList.add).toHaveBeenCalledWith('graph-node-level');
  });
});
