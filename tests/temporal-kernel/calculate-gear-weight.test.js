import { describe, it, expect } from 'vitest';
import { calculateGearWeight } from '/systems/continuum-v2/modules/temporal-kernel/calculate-gear-weight.js';

describe('calculateGearWeight', () => {
  it('returns 0 for empty array', () => {
    expect(calculateGearWeight([])).toBe(0);
  });

  it('sums weight * quantity for carried items', () => {
    const items = [
      { system: { carried: true, weight: 2, quantity: 3 } },
      { system: { carried: true, weight: 1, quantity: 5 } }
    ];
    expect(calculateGearWeight(items)).toBe(11);
  });

  it('skips non-carried items', () => {
    const items = [
      { system: { carried: true, weight: 2, quantity: 1 } },
      { system: { carried: false, weight: 10, quantity: 10 } }
    ];
    expect(calculateGearWeight(items)).toBe(2);
  });

  it('defaults quantity to NaN-safe multiplication', () => {
    const items = [{ system: { carried: true, weight: 3, quantity: 2 } }];
    expect(calculateGearWeight(items)).toBe(6);
  });
});