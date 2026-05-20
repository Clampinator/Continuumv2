import { describe, it, expect } from 'vitest';
import { computeRailOffset } from '../../modules/temporal-kernel/compute-rail-offset.js';

describe('computeRailOffset', () => {
  const DOB = 1000000;

  it('should return dobTs when no spans are provided', () => {
    expect(computeRailOffset(DOB, 100, [])).toBe(DOB);
  });

  it('should return dobTs when spans array is null', () => {
    expect(computeRailOffset(DOB, 100, null)).toBe(DOB);
  });

  it('should ignore spans with age greater than targetAge', () => {
    const spans = [
      { age: 200, fromTs: 1000, toTs: 2000 }
    ];
    expect(computeRailOffset(DOB, 100, spans)).toBe(DOB);
  });

  it('should include spans with age equal to targetAge', () => {
    const spans = [
      { age: 100, fromTs: 1000, toTs: 2000 }
    ];
    // displacement = 2000 - 1000 = 1000
    expect(computeRailOffset(DOB, 100, spans)).toBe(DOB + 1000);
  });

  it('should accumulate displacement from multiple qualifying spans', () => {
    const spans = [
      { age: 10, fromTs: 1000, toTs: 3000 },
      { age: 50, fromTs: 5000, toTs: 8000 },
      { age: 200, fromTs: 9000, toTs: 12000 }
    ];
    // Only first two qualify (age <= 100)
    // displacement = (3000-1000) + (8000-5000) = 2000 + 3000 = 5000
    expect(computeRailOffset(DOB, 100, spans)).toBe(DOB + 5000);
  });

  it('should skip spans where toTs equals fromTs', () => {
    const spans = [
      { age: 10, fromTs: 1000, toTs: 1000 }
    ];
    expect(computeRailOffset(DOB, 100, spans)).toBe(DOB);
  });

  it('should skip spans with non-finite age', () => {
    const spans = [
      { age: NaN, fromTs: 1000, toTs: 2000 }
    ];
    expect(computeRailOffset(DOB, 100, spans)).toBe(DOB);
  });

  it('should skip spans with non-finite timestamps', () => {
    const spans = [
      { age: 10, fromTs: NaN, toTs: 2000 }
    ];
    expect(computeRailOffset(DOB, 100, spans)).toBe(DOB);
  });

  it('should handle targetAge of 0 with no qualifying spans', () => {
    const spans = [
      { age: 10, fromTs: 1000, toTs: 2000 }
    ];
    // age 10 > targetAge 0, so excluded
    expect(computeRailOffset(DOB, 0, spans)).toBe(DOB);
  });

  it('should return 0 when dobTs is invalid', () => {
    expect(computeRailOffset(null, 100, [])).toBe(0);
  });
});