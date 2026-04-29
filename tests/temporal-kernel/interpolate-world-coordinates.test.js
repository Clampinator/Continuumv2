import { describe, it, expect } from 'vitest';
import { interpolateWorldCoordinates } from '../../modules/temporal-kernel/interpolate-world-coordinates.js';

describe('interpolateWorldCoordinates', () => {
  it('should return start point at t=0', () => {
    const result = interpolateWorldCoordinates(
      { age: 10, time: 5000 },
      { age: 20, time: 10000 },
      0
    );
    expect(result.age).toBe(10);
    expect(result.time).toBe(5000);
  });

  it('should return end point at t=1', () => {
    const result = interpolateWorldCoordinates(
      { age: 10, time: 5000 },
      { age: 20, time: 10000 },
      1
    );
    expect(result.age).toBe(20);
    expect(result.time).toBe(10000);
  });

  it('should return midpoint at t=0.5', () => {
    const result = interpolateWorldCoordinates(
      { age: 10, time: 5000 },
      { age: 20, time: 10000 },
      0.5
    );
    expect(result.age).toBe(15);
    expect(result.time).toBe(7500);
  });

  it('should clamp t to 0 when negative', () => {
    const result = interpolateWorldCoordinates(
      { age: 10, time: 5000 },
      { age: 20, time: 10000 },
      -0.5
    );
    expect(result.age).toBe(10);
    expect(result.time).toBe(5000);
  });

  it('should clamp t to 1 when greater than 1', () => {
    const result = interpolateWorldCoordinates(
      { age: 10, time: 5000 },
      { age: 20, time: 10000 },
      1.5
    );
    expect(result.age).toBe(20);
    expect(result.time).toBe(10000);
  });

  it('should default to 0 for invalid inputs', () => {
    const result = interpolateWorldCoordinates(
      { age: null, time: null },
      { age: null, time: null },
      0.5
    );
    expect(result.age).toBe(0);
    expect(result.time).toBe(0);
  });

  it('should handle 0.25 interpolation', () => {
    const result = interpolateWorldCoordinates(
      { age: 0, time: 0 },
      { age: 100, time: 4000 },
      0.25
    );
    expect(result.age).toBe(25);
    expect(result.time).toBe(1000);
  });
});