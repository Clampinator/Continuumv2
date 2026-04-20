import { describe, it, expect } from 'vitest';
import { worldToScreen, screenToWorld } from '../../modules/temporal-engine/projection.js';

describe('Coordinate Utilities', () => {
  const viewState = {
    x: 100,
    y: 200,
    scaleX: 1,
    scaleY: -0.00045 // TARGET_RATIO
  };

  it('should project world coordinates to screen space', () => {
    const age = 1000; // 1000 seconds
    const time = 5000; // 5000 ms
    
    // ScreenX = panX + age * scaleX
    // ScreenY = panY + time * scaleY
    const result = worldToScreen(age, time, viewState);
    
    expect(result.x).toBe(100 + 1000 * 1);
    expect(result.y).toBe(200 + 5000 * -0.00045);
  });

  it('should project screen space back to world coordinates', () => {
    const screenX = 1100;
    const screenY = 197.75; // 200 + 5000 * -0.00045
    
    const result = screenToWorld(screenX, screenY, viewState);
    
    expect(result.age).toBe(1000);
    expect(result.time).toBeCloseTo(5000, 2);
  });
});
