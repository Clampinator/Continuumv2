import { describe, it, expect } from 'vitest';
import { getSpanWeightLimit } from '/systems/continuum-v2/modules/temporal-kernel/get-span-weight-limit.js';

describe('getSpanWeightLimit', () => {
  it('returns 5 for span rank 0 (leveller)', () => {
    expect(getSpanWeightLimit(0)).toBe(5);
  });

  it('returns 10 for span rank 1', () => {
    expect(getSpanWeightLimit(1)).toBe(10);
  });

  it('returns 50 for span rank 2', () => {
    expect(getSpanWeightLimit(2)).toBe(50);
  });

  it('returns 100 for span rank 3', () => {
    expect(getSpanWeightLimit(3)).toBe(100);
  });

  it('returns 500 for span rank 4', () => {
    expect(getSpanWeightLimit(4)).toBe(500);
  });

  it('returns 1000 for span rank 5', () => {
    expect(getSpanWeightLimit(5)).toBe(1000);
  });

  it('returns 5 (default) for out-of-range rank 6', () => {
    expect(getSpanWeightLimit(6)).toBe(5);
  });

  it('returns 5 (default) for negative rank', () => {
    expect(getSpanWeightLimit(-1)).toBe(5);
  });

  it('returns 5 (default) for undefined', () => {
    expect(getSpanWeightLimit(undefined)).toBe(5);
  });
});