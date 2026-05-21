import { describe, it, expect } from 'vitest';
import { isUnitGated } from '/systems/continuum-v2/modules/temporal-kernel/is-unit-gated.js';

describe('isUnitGated', () => {
  it('should return true when unit tier exceeds external reputation', () => {
    expect(isUnitGated(3, 2)).toBe(true);
  });

  it('should return false when unit tier is below external reputation', () => {
    expect(isUnitGated(2, 3)).toBe(false);
  });

  it('should return false when unit tier equals external reputation', () => {
    expect(isUnitGated(3, 3)).toBe(false);
  });

  it('should return false when both are zero', () => {
    expect(isUnitGated(0, 0)).toBe(false);
  });
});