import { describe, it, expect } from 'vitest';
import { isLeveller } from '/systems/continuum-v2/modules/temporal-kernel/is-leveller.js';

describe('isLeveller', () => {
  it('returns true for span rank 0', () => {
    expect(isLeveller(0)).toBe(true);
  });

  it('returns false for span rank 1', () => {
    expect(isLeveller(1)).toBe(false);
  });

  it('returns false for span rank 2', () => {
    expect(isLeveller(2)).toBe(false);
  });

  it('returns false for span rank 3', () => {
    expect(isLeveller(3)).toBe(false);
  });

  it('returns false for span rank 4', () => {
    expect(isLeveller(4)).toBe(false);
  });

  it('returns false for span rank 5', () => {
    expect(isLeveller(5)).toBe(false);
  });

  it('returns false for negative rank (not a valid leveller)', () => {
    expect(isLeveller(-1)).toBe(false);
  });
});