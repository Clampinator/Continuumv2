import { describe, it, expect } from 'vitest';
import { calculateSpanDisplacement } from '../../modules/temporal-kernel/calculate-span-displacement.js';

describe('calculateSpanDisplacement', () => {
  it('should calculate the difference between departure and arrival timestamps', () => {
    const departure = 10000;
    const arrival = 15000;
    expect(calculateSpanDisplacement(departure, arrival)).toBe(5000);
  });

  it('should handle negative displacement (past spans)', () => {
    const departure = 10000;
    const arrival = 5000;
    expect(calculateSpanDisplacement(departure, arrival)).toBe(-5000);
  });

  it('should return 0 if timestamps are missing', () => {
    expect(calculateSpanDisplacement(null, 15000)).toBe(0);
    expect(calculateSpanDisplacement(10000, null)).toBe(0);
  });
});
