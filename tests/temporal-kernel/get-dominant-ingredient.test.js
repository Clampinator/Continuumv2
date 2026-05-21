import { describe, it, expect } from 'vitest';
import { getDominantIngredient } from '/systems/continuum-v2/modules/temporal-kernel/get-dominant-ingredient.js';

describe('getDominantIngredient', () => {
  it('returns the key with the highest value', () => {
    expect(getDominantIngredient({
      coercion: 3, creativity: 1, farsense: 0, pk: 0, redaction: 0
    })).toBe('coercion');
  });

  it('returns null when all values are 0', () => {
    expect(getDominantIngredient({
      coercion: 0, creativity: 0, farsense: 0, pk: 0, redaction: 0
    })).toBeNull();
  });

  it('breaks ties by canonical key order (coercion first)', () => {
    expect(getDominantIngredient({
      coercion: 2, creativity: 2, farsense: 0, pk: 0, redaction: 0
    })).toBe('coercion');
  });

  it('breaks ties by canonical key order (creativity before farsense)', () => {
    expect(getDominantIngredient({
      coercion: 0, creativity: 3, farsense: 3, pk: 0, redaction: 0
    })).toBe('creativity');
  });

  it('finds pk as dominant', () => {
    expect(getDominantIngredient({
      coercion: 1, creativity: 0, farsense: 0, pk: 5, redaction: 2
    })).toBe('pk');
  });

  it('finds redaction as dominant', () => {
    expect(getDominantIngredient({
      coercion: 0, creativity: 0, farsense: 1, pk: 0, redaction: 4
    })).toBe('redaction');
  });

  it('coerces string numbers to numeric', () => {
    expect(getDominantIngredient({
      coercion: '3', creativity: '1', farsense: '0', pk: '0', redaction: '0'
    })).toBe('coercion');
  });

  it('treats missing fields as 0', () => {
    expect(getDominantIngredient({
      coercion: 2
    })).toBe('coercion');
    expect(getDominantIngredient({})).toBeNull();
  });
});