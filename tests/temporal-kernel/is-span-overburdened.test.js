import { describe, it, expect } from 'vitest';
import { isSpanOverburdened } from '/systems/continuum-v2/modules/temporal-kernel/is-span-overburdened.js';

describe('isSpanOverburdened', () => {
  it('returns true when encumbrance exceeds limit', () => {
    expect(isSpanOverburdened(10, 5)).toBe(true);
  });

  it('returns false when encumbrance is below limit', () => {
    expect(isSpanOverburdened(5, 10)).toBe(false);
  });

  it('returns false when encumbrance equals limit (at capacity but not over)', () => {
    expect(isSpanOverburdened(5, 5)).toBe(false);
  });

  it('returns false when both are zero', () => {
    expect(isSpanOverburdened(0, 0)).toBe(false);
  });

  it('returns true for large encumbrance vs small limit', () => {
    expect(isSpanOverburdened(500, 10)).toBe(true);
  });
});