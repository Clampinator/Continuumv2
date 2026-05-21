import { describe, it, expect } from 'vitest';
import { clampTempToPerm } from '/systems/continuum-v2/modules/temporal-kernel/clamp-temp-to-perm.js';

describe('clampTempToPerm', () => {
  it('returns temp unchanged when within bounds', () => {
    expect(clampTempToPerm(5, 7)).toBe(5);
  });

  it('clamps temp to perm when it exceeds', () => {
    expect(clampTempToPerm(8, 5)).toBe(5);
  });

  it('allows zero temp', () => {
    expect(clampTempToPerm(0, 5)).toBe(0);
  });

  it('allows zero perm (both zero)', () => {
    expect(clampTempToPerm(5, 0)).toBe(0);
  });

  it('handles negative temp', () => {
    expect(clampTempToPerm(-1, 5)).toBe(-1);
  });
});