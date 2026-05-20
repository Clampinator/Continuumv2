import { describe, it, expect } from 'vitest';
import { adjustSpanOnDepartureEdit } from '/systems/continuum-v2/modules/temporal-kernel/adjust-span-departure.js';

describe('adjustSpanOnDepartureEdit', () => {
  it('should preserve span duration when departure shifts forward', () => {
    // Old: depart=1000, arrive=2000 (span=1000ms)
    // New: depart=5000, arrive should be 6000 (delta=4000, above tolerance)
    const result = adjustSpanOnDepartureEdit(5000, 1000, 2000);
    expect(result.arrivalTs).toBe(6000);
    expect(result.adjusted).toBe(true);
  });

  it('should preserve span duration when departure shifts backward', () => {
    // Old: depart=3000, arrive=6000 (span=3000ms)
    // New: depart=1000 (delta=-2000, above tolerance)
    const result = adjustSpanOnDepartureEdit(1000, 3000, 6000);
    expect(result.arrivalTs).toBe(4000);
    expect(result.adjusted).toBe(true);
  });

  it('should return unchanged arrival when delta is zero', () => {
    const result = adjustSpanOnDepartureEdit(1000, 1000, 2000);
    // Zero delta is below tolerance (1000ms) - treated as TTL noise
    expect(result.arrivalTs).toBe(2000);
    expect(result.adjusted).toBe(false);
  });

  it('should return unchanged arrival when delta is below tolerance (TTL noise)', () => {
    // 500ms drift is below 1000ms tolerance - treat as noise
    const result = adjustSpanOnDepartureEdit(1500, 1000, 2000, 1000);
    expect(result.arrivalTs).toBe(2000);
    expect(result.adjusted).toBe(false);
  });

  it('should adjust arrival when delta equals tolerance exactly', () => {
    // 1000ms exactly is at the boundary - should adjust
    const result = adjustSpanOnDepartureEdit(2000, 1000, 3000, 1000);
    expect(result.arrivalTs).toBe(4000);
    expect(result.adjusted).toBe(true);
  });

  it('should adjust arrival when delta exceeds tolerance', () => {
    // 2000ms well above 1000ms tolerance
    const result = adjustSpanOnDepartureEdit(3000, 1000, 5000);
    expect(result.arrivalTs).toBe(7000);
    expect(result.adjusted).toBe(true);
  });

  it('should treat backward drift below tolerance as noise', () => {
    // -500ms drift (backward) is below 1000ms tolerance
    const result = adjustSpanOnDepartureEdit(500, 1000, 3000, 1000);
    expect(result.arrivalTs).toBe(3000);
    expect(result.adjusted).toBe(false);
  });

  it('should adjust arrival for backward shift exceeding tolerance', () => {
    // -2000ms backward shift exceeds tolerance
    const result = adjustSpanOnDepartureEdit(1000, 3000, 5000, 1000);
    expect(result.arrivalTs).toBe(3000);
    expect(result.adjusted).toBe(true);
  });

  it('should handle large forward shift', () => {
    const result = adjustSpanOnDepartureEdit(946800000000, 946772400000, 946781040000);
    // Delta = 27600000ms - well above tolerance
    expect(result.arrivalTs).toBe(946781040000 + 27600000);
    expect(result.adjusted).toBe(true);
  });

  it('should NOT adjust when departure differs by less than 1 second (default tolerance)', () => {
    // 100ms TTL rounding noise
    const result = adjustSpanOnDepartureEdit(946772400100, 946772400000, 946781040000);
    expect(result.arrivalTs).toBe(946781040000);
    expect(result.adjusted).toBe(false);
  });

  it('should use custom tolerance when provided', () => {
    // 500ms delta: fails with 1000ms tolerance, passes with 100ms tolerance
    const result1 = adjustSpanOnDepartureEdit(1500, 1000, 3000, 1000);
    expect(result1.adjusted).toBe(false);

    const result2 = adjustSpanOnDepartureEdit(1500, 1000, 3000, 100);
    expect(result2.adjusted).toBe(true);
    expect(result2.arrivalTs).toBe(3500);
  });
});