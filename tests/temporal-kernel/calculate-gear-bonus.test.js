import { describe, it, expect } from 'vitest';
import { calculateGearBonus } from '/systems/continuum-v2/modules/temporal-kernel/calculate-gear-bonus.js';

describe('calculateGearBonus', () => {
  it('returns floor of average when all aspects are equal', () => {
    expect(calculateGearBonus(3, 3, 3)).toBe(3);
  });

  it('returns floor of average for mixed aspects', () => {
    expect(calculateGearBonus(1, 2, 3)).toBe(2);
  });

  it('uses legacy bonus when all aspects are 0 and legacy is positive', () => {
    expect(calculateGearBonus(0, 0, 0, 5)).toBe(5);
  });

  it('returns 0 when all aspects and legacy are 0', () => {
    expect(calculateGearBonus(0, 0, 0, 0)).toBe(0);
  });

  it('returns 0 when all aspects are 0 with no legacy', () => {
    expect(calculateGearBonus(0, 0, 0)).toBe(0);
  });

  it('floors fractional results', () => {
    expect(calculateGearBonus(1, 0, 0)).toBe(0);
  });

  it('ignores legacy bonus when aspects are non-zero', () => {
    expect(calculateGearBonus(1, 1, 1, 10)).toBe(1);
  });
});