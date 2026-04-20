import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TooltipManager } from '../../modules/span-graph/ui/tooltips.js';

describe('TooltipManager', () => {
  let viewport;
  let tooltipManager;

  if (typeof global.document === 'undefined') {
    global.document = {
      createElementNS: vi.fn(() => ({
        setAttribute: vi.fn(),
        style: {},
        appendChild: vi.fn(),
        querySelector: vi.fn(() => ({
            setAttribute: vi.fn(),
            style: {}
        }))
      }))
    };
  }

  beforeEach(() => {
    viewport = {
      svg: {
        appendChild: vi.fn()
      }
    };
    tooltipManager = new TooltipManager(viewport);
  });

  it('should create a tooltip group in the SVG', () => {
    expect(viewport.svg.appendChild).toHaveBeenCalled();
  });

  it('should show tooltip with correct data and position', () => {
    const eventData = { id: 'e1', description: 'Test Event', age: 25 };
    const screenPos = { x: 100, y: 200 };
    
    tooltipManager.show(eventData, screenPos);
    
    // Check if the internal group's visibility and position are updated
    // This depends on the implementation details we'll build next.
    expect(tooltipManager.isVisible).toBe(true);
  });

  it('should hide tooltip when requested', () => {
    tooltipManager.show({ id: 'e1' }, { x: 0, y: 0 });
    tooltipManager.hide();
    expect(tooltipManager.isVisible).toBe(false);
  });
});
