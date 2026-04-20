import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autoCenter } from '../../modules/span-graph/actions/auto-center.js';

describe('Auto-Center Logic', () => {
  let viewport;

  beforeEach(() => {
    viewport = {
      viewState: { panX: 0, panY: 0, zoom: 1 },
      setViewState: vi.fn(function(state) {
        this.viewState = { ...this.viewState, ...state };
      }),
      worldToScreen: vi.fn((age, time) => ({
        x: (age * viewport.viewState.zoom) + viewport.viewState.panX,
        y: (time * viewport.viewState.zoom) + viewport.viewState.panY
      })),
      container: {
        clientWidth: 1000,
        clientHeight: 500
      }
    };
  });

  it('should center the view on a specific age and time', () => {
    const target = { age: 100, time: 5000 };
    
    autoCenter(viewport, target);

    // After centering, target screen pos should be center of container (500, 250)
    // containerCenter = (targetWorld * zoom) + newPan
    // newPan = containerCenter - (targetWorld * zoom)
    // newPanX = 500 - (100 * 1) = 400
    // newPanY = 250 - (5000 * 1) = -4750
    
    expect(viewport.viewState.panX).toBe(400);
    expect(viewport.viewState.panY).toBe(-4750);
  });

  it('should respect the current zoom level when centering', () => {
    viewport.viewState.zoom = 2;
    const target = { age: 100, time: 5000 };
    
    autoCenter(viewport, target);
    
    // newPanX = 500 - (100 * 2) = 300
    // newPanY = 250 - (5000 * 2) = -9750
    expect(viewport.viewState.panX).toBe(300);
    expect(viewport.viewState.panY).toBe(-9750);
  });
});
