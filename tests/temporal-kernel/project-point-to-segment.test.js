import { describe, it, expect } from 'vitest';
import { projectPointToSegment } from '../../modules/temporal-kernel/project-point-to-segment.js';

describe('projectPointToSegment', () => {
  it('should project point onto horizontal segment at midpoint', () => {
    const result = projectPointToSegment(5, 5, 0, 0, 10, 0);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(0);
    expect(result.t).toBeCloseTo(0.5);
    expect(result.dist).toBeCloseTo(5);
  });

  it('should project point onto vertical segment', () => {
    const result = projectPointToSegment(0, 5, 0, 0, 0, 10);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(5);
    expect(result.t).toBeCloseTo(0.5);
    expect(result.dist).toBeCloseTo(0);
  });

  it('should clamp t to 0 when point is before segment start', () => {
    const result = projectPointToSegment(-5, 5, 0, 0, 10, 0);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.t).toBe(0);
  });

  it('should clamp t to 1 when point is after segment end', () => {
    const result = projectPointToSegment(15, 5, 0, 0, 10, 0);
    expect(result.x).toBeCloseTo(10);
    expect(result.y).toBeCloseTo(0);
    expect(result.t).toBe(1);
  });

  it('should handle zero-length segment', () => {
    const result = projectPointToSegment(5, 5, 3, 3, 3, 3);
    expect(result.x).toBeCloseTo(3);
    expect(result.y).toBeCloseTo(3);
    expect(result.t).toBe(0);
    expect(result.dist).toBeCloseTo(Math.hypot(5 - 3, 5 - 3));
  });

  it('should project onto diagonal segment', () => {
    const result = projectPointToSegment(0, 0, 0, 0, 10, 10);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.t).toBeCloseTo(0);
    expect(result.dist).toBeCloseTo(0);
  });

  it('should project point off diagonal segment correctly', () => {
    // Point (5, 0) projected onto segment (0,0)->(10,10)
    // Closest point is at t=0.25 -> (2.5, 2.5)
    const result = projectPointToSegment(5, 0, 0, 0, 10, 10);
    expect(result.t).toBeCloseTo(0.25);
    expect(result.x).toBeCloseTo(2.5);
    expect(result.y).toBeCloseTo(2.5);
  });
});