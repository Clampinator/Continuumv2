import { describe, it, expect } from 'vitest';
import { calculateGridStep } from '../../modules/temporal-engine/projection.js';

describe('calculateGridStep', () => {
  it('should return 3600 (1 hour) for zoom > 0.001', () => {
    expect(calculateGridStep(0.01)).toBe(3600);
    expect(calculateGridStep(0.002)).toBe(3600);
    expect(calculateGridStep(0.0011)).toBe(3600);
  });

  it('should return 86400 (1 day) for zoom strictly between 0.0001 and 0.001', () => {
    expect(calculateGridStep(0.0005)).toBe(86400);
    expect(calculateGridStep(0.0002)).toBe(86400);
    expect(calculateGridStep(0.00011)).toBe(86400);
  });

  it('should return 2592000 (30 days) for zoom strictly between 0.00001 and 0.0001', () => {
    expect(calculateGridStep(0.00005)).toBe(2592000);
    expect(calculateGridStep(0.00002)).toBe(2592000);
    expect(calculateGridStep(0.000011)).toBe(2592000);
  });

  it('should return 31536000 (1 year) for zoom <= 0.00001', () => {
    expect(calculateGridStep(0.000005)).toBe(31536000);
    expect(calculateGridStep(0.000001)).toBe(31536000);
    expect(calculateGridStep(0)).toBe(31536000);
    expect(calculateGridStep(0.00001)).toBe(31536000);
    expect(calculateGridStep(0.0001)).toBe(2592000);
  });

  it('should handle negative zoom as year step', () => {
    expect(calculateGridStep(-0.001)).toBe(31536000);
  });
});