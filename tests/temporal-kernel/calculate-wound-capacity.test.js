import { describe, it, expect } from 'vitest';
import { calculateWoundCapacity } from '/systems/continuum-v2/modules/temporal-kernel/calculate-wound-capacity.js';

describe('calculateWoundCapacity', () => {
  it('calculates wound capacity with wounds', () => {
    const result = calculateWoundCapacity(5, [{ ip: 3 }, { ip: 2 }]);
    expect(result.ipTotal).toBe(5);
    expect(result.ipRemaining).toBe(10);
  });

  it('returns full capacity with no wounds', () => {
    const result = calculateWoundCapacity(3, []);
    expect(result.ipTotal).toBe(0);
    expect(result.ipRemaining).toBe(9);
  });

  it('allows negative remaining when over capacity', () => {
    const result = calculateWoundCapacity(0, [{ ip: 1 }]);
    expect(result.ipTotal).toBe(1);
    expect(result.ipRemaining).toBe(-1);
  });

  it('treats non-numeric ip as 0', () => {
    const result = calculateWoundCapacity(3, [{ ip: null }, { ip: 'bad' }]);
    expect(result.ipTotal).toBe(0);
    expect(result.ipRemaining).toBe(9);
  });
});