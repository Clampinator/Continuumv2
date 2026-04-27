import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PathPainter } from '../../modules/lifeline/painters/path-painter.js';

describe('PathPainter', () => {
  let mockGroup;
  let mockViewState;

  beforeEach(() => {
    mockGroup = {
      innerHTML: '',
      appendChild: vi.fn(),
      querySelector: vi.fn(() => null)
    };

    mockViewState = {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1
    };

    // Mock DOM globals
    global.document = {
      createElementNS: vi.fn(() => {
        const el = {
          setAttribute: vi.fn((name, value) => {
            el[name] = value;
          }),
          classList: { add: vi.fn() },
          style: {}
        };
        return el;
      })
    };
  });

  it('should use eventAge and eventTime standard for coordinates', () => {
    const graphData = {
      levelNodes: [
        { eventAge: 100, eventTime: 1000 },
        { eventAge: 200, eventTime: 2000 }
      ],
      nowNode: { eventAge: 300, eventTime: 3000 }
    };

    PathPainter.drawLifeline(mockGroup, mockViewState, graphData);

    const path1 = document.createElementNS.mock.results[0].value;
    expect(path1.d).toContain('100 1000');
    expect(path1.d).toContain('200 2000');
  });

  it('should draw a vertical dashed line for spans and shift the next rail', () => {
    const graphData = {
      levelNodes: [
        { 
          eventAge: 100, 
          eventTime: 1000, 
          eventIsSpan: true, 
          arrivalY: 5000 
        },
        { 
          eventAge: 200, 
          eventTime: 6000 
        }
      ],
      nowNode: { eventAge: 200, eventTime: 6000 }
    };

    PathPainter.drawLifeline(mockGroup, mockViewState, graphData);

    expect(mockGroup.appendChild).toHaveBeenCalledTimes(3);

    const spanJump = document.createElementNS.mock.results[0].value;
    expect(spanJump.d).toBe('M 100 1000 L 100 5000');
    expect(spanJump.classList.add).toHaveBeenCalledWith('graph-segment-span');

    const nextRail = document.createElementNS.mock.results[1].value;
    expect(nextRail.d).toBe('M 100 5000 L 200 6000');
  });

  it('should draw a drag line using eventAge and eventTime', () => {
    const dragPreview = {
      from: { eventAge: 10, eventTime: 100 },
      to: { eventAge: 20, eventTime: 200 },
      type: 'level'
    };

    PathPainter.drawDragLine(mockGroup, mockViewState, dragPreview);

    expect(mockGroup.appendChild).toHaveBeenCalledTimes(1);
    const path = document.createElementNS.mock.results[0].value;
    expect(path.d).toBe('M 10 100 L 20 200');
  });
});
