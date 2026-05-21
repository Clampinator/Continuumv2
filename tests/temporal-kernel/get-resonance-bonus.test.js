import { describe, it, expect } from 'vitest';
import { getResonanceBonus } from '/systems/continuum-v2/modules/temporal-kernel/get-resonance-bonus.js';

describe('getResonanceBonus', () => {
  it('returns 3 for strong resonance', () => {
    expect(getResonanceBonus('strong')).toBe(3);
  });

  it('returns 2 for firm resonance', () => {
    expect(getResonanceBonus('firm')).toBe(2);
  });

  it('returns 1 for slight resonance', () => {
    expect(getResonanceBonus('slight')).toBe(1);
  });

  it('returns 0 for none', () => {
    expect(getResonanceBonus('none')).toBe(0);
  });

  it('returns 0 for unknown tier string', () => {
    expect(getResonanceBonus('unknown')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(getResonanceBonus('')).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(getResonanceBonus(undefined)).toBe(0);
  });
});