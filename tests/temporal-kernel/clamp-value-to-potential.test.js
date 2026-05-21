import { describe, it, expect } from 'vitest';
import { clampValueToPotential } from '/systems/continuum-v2/modules/temporal-kernel/clamp-value-to-potential.js';

describe('clampValueToPotential', () => {
  it('returns value unchanged when within bounds', () => {
    expect(clampValueToPotential(3, 5)).toBe(3);
  });

  it('clamps value to potential when it exceeds', () => {
    expect(clampValueToPotential(5, 3)).toBe(3);
  });

  it('allows zero value', () => {
    expect(clampValueToPotential(0, 5)).toBe(0);
  });

  it('allows zero potential (both zero)', () => {
    expect(clampValueToPotential(5, 0)).toBe(0);
  });
});