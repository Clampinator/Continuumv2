import { describe, it, expect } from 'vitest';
import { worldToScreen, screenToWorld } from '../../modules/temporal-engine/projection.js';

describe('Coordinate Utilities', () => {
  const viewState = {
    panX: 100,
    panY: 200,
    zoom: 1
  };

  it('should project world coordinates to screen space', () => {
    const age = 1000; // 1000 seconds
    const time = 5000; // 5000 ms
    
    // ScreenX = panX + age * zoom
    // ScreenY = panY + time * zoom
    const result = worldToScreen(age, time, viewState);
    
    expect(result.x).toBe(100 + 1000 * 1);
    expect(result.y).toBe(200 + 5000 * 1);
  });

  it('should project screen space back to world coordinates', () => {
    const screenX = 1100;
    const screenY = 5200; // 200 + 5000 * 1
    
    const result = screenToWorld(screenX, screenY, viewState);
    
    expect(result.age).toBe(1000);
    expect(result.time).toBeCloseTo(5000, 2);
  });
});
