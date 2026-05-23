import { describe, it, expect } from 'vitest';
import { calculateQuickPenalty } from '/systems/continuum-v2/modules/temporal-kernel/calculate-quick-penalty.js';

describe('calculateQuickPenalty', () => {
  it('returns 0 when encumbrance equals Force', () => {
    expect(calculateQuickPenalty(5, 5)).toBe(0);
  });

  it('returns 0 when encumbrance is less than Force', () => {
    expect(calculateQuickPenalty(3, 5)).toBe(0);
  });

  it('returns the difference when encumbrance exceeds Force', () => {
    expect(calculateQuickPenalty(8, 5)).toBe(3);
  });

  it('returns 0 when both are 0', () => {
    expect(calculateQuickPenalty(0, 0)).toBe(0);
  });

  it('handles large encumbrance values', () => {
    expect(calculateQuickPenalty(100, 10)).toBe(90);
  });
});