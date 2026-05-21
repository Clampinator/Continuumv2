import { describe, it, expect } from 'vitest';
import { clampIngredientValue } from '/systems/continuum-v2/modules/temporal-kernel/clamp-ingredient-value.js';

describe('clampIngredientValue', () => {
  it('returns value unchanged when within all caps', () => {
    expect(clampIngredientValue(3, 5, 2, 6)).toBe(3);
  });

  it('clamps to metaRank when value exceeds rank', () => {
    expect(clampIngredientValue(5, 3, 0, 6)).toBe(3);
  });

  it('clamps to volume remaining when volume is nearly full', () => {
    // volumeLimit=6, otherTotal=5, remaining=1
    expect(clampIngredientValue(3, 5, 5, 6)).toBe(1);
  });

  it('returns 0 when volume is completely full', () => {
    expect(clampIngredientValue(3, 5, 6, 6)).toBe(0);
  });

  it('returns 0 for zero value', () => {
    expect(clampIngredientValue(0, 5, 0, 6)).toBe(0);
  });

  it('clamps negative input to 0', () => {
    expect(clampIngredientValue(-1, 5, 0, 6)).toBe(0);
  });

  it('clamps value above 5 to 5 before rank check', () => {
    expect(clampIngredientValue(8, 5, 0, 10)).toBe(5);
  });

  it('clamps NaN value to 0', () => {
    expect(clampIngredientValue(NaN, 5, 0, 6)).toBe(0);
  });

  it('handles all zeros', () => {
    expect(clampIngredientValue(0, 0, 0, 0)).toBe(0);
  });
});