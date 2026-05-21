import { describe, it, expect } from 'vitest';
import { isAtPotential } from '/systems/continuum-v2/modules/temporal-kernel/is-at-potential.js';

describe('isAtPotential', () => {
  it('returns true when current equals potential', () => {
    expect(isAtPotential(3, 3)).toBe(true);
  });

  it('returns true when current exceeds potential', () => {
    expect(isAtPotential(4, 3)).toBe(true);
  });

  it('returns false when current is below potential', () => {
    expect(isAtPotential(2, 3)).toBe(false);
  });

  it('returns true when both are 0', () => {
    expect(isAtPotential(0, 0)).toBe(true);
  });

  it('returns true when potential is 0 and current is 0', () => {
    expect(isAtPotential(0, 0)).toBe(true);
  });

  it('returns false when current is 0 but potential is positive', () => {
    expect(isAtPotential(0, 1)).toBe(false);
  });
});