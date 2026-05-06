import { describe, it, expect } from 'vitest';
import { adjustSpanOnDepartureEdit } from '/systems/continuum-v2/modules/temporal-kernel/adjust-span-departure.js';

describe('adjustSpanOnDepartureEdit', () => {
  it('should preserve span duration when departure shifts forward', () => {
    // Old: depart=1000, arrive=2000 (span=1000ms)
    // New: depart=1500, arrive should be 2500
    const result = adjustSpanOnDepartureEdit(1500, 1000, 2000);
    expect(result).toBe(2500);
  });

  it('should preserve span duration when departure shifts backward', () => {
    // Old: depart=2000, arrive=5000 (span=3000ms)
    // New: depart=1000, arrive should be 4000
    const result = adjustSpanOnDepartureEdit(1000, 2000, 5000);
    expect(result).toBe(4000);
  });

  it('should return unchanged arrival when delta is zero', () => {
    const result = adjustSpanOnDepartureEdit(1000, 1000, 2000);
    expect(result).toBe(2000);
  });

  it('should handle large forward shift', () => {
    const result = adjustSpanOnDepartureEdit(946772400000, 946772400000, 946781040000);
    // Zero delta - arrival unchanged
    expect(result).toBe(946781040000);
  });

  it('should handle large departure delta', () => {
    const result = adjustSpanOnDepartureEdit(946800000000, 946772400000, 946781040000);
    // Delta = 946800000000 - 946772400000 = 27600000ms
    expect(result).toBe(946781040000 + 27600000);
  });
});