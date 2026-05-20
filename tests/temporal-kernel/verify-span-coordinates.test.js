import { describe, it, expect } from 'vitest';
import { verifySpanCoordinates } from '/systems/continuum-v2/modules/temporal-kernel/verify-span-coordinates.js';

// NOTE: The handshake is now wired directly into insert-history-row.js and
// update-history-row.js as inline drift checks (comparing TTL-produced values
// against pre-computed values before the override). This test file validates
// the Kernel utility function, which is still available for ad-hoc checks.

describe('verifySpanCoordinates', () => {
  it('should verify when committed matches target exactly', () => {
    const committed = { ts: 946772400000, arrivalTs: 946781040000, eventAge: 25 * 31536000 };
    const target = { ts: 946772400000, arrivalTs: 946781040000, eventAge: 25 * 31536000, id: 'test1' };
    const result = verifySpanCoordinates(committed, target);
    expect(result.verified).toBe(true);
    expect(result.driftTs).toBe(0);
    expect(result.driftArrivalTs).toBe(0);
  });

  it('should verify when drift is within 1000ms tolerance', () => {
    const committed = { ts: 946772400000, arrivalTs: 946781040500, eventAge: 25 * 31536000 };
    const target = { ts: 946772400000, arrivalTs: 946781040000, eventAge: 25 * 31536000, id: 'test2' };
    const result = verifySpanCoordinates(committed, target);
    expect(result.verified).toBe(true);
    expect(result.driftArrivalTs).toBe(500);
  });

  it('should fail when ts drift exceeds 1000ms', () => {
    const committed = { ts: 946772405000, arrivalTs: 946781040000, eventAge: 25 * 31536000 };
    const target = { ts: 946772400000, arrivalTs: 946781040000, eventAge: 25 * 31536000, id: 'test3' };
    const result = verifySpanCoordinates(committed, target);
    expect(result.verified).toBe(false);
    expect(result.driftTs).toBe(5000);
  });

  it('should fail when arrivalTs drift exceeds 1000ms', () => {
    const committed = { ts: 946772400000, arrivalTs: 946781050000, eventAge: 25 * 31536000 };
    const target = { ts: 946772400000, arrivalTs: 946781040000, eventAge: 25 * 31536000, id: 'test4' };
    const result = verifySpanCoordinates(committed, target);
    expect(result.verified).toBe(false);
    expect(result.driftArrivalTs).toBe(10000);
  });

  it('should use custom tolerance when provided', () => {
    const committed = { ts: 946772400000, arrivalTs: 946781041000, eventAge: 25 * 31536000 };
    const target = { ts: 946772400000, arrivalTs: 946781040000, eventAge: 25 * 31536000, id: 'test5' };
    // 1000ms drift: passes with 2000ms tolerance, fails with 500ms tolerance
    expect(verifySpanCoordinates(committed, target, 2000).verified).toBe(true);
    expect(verifySpanCoordinates(committed, target, 500).verified).toBe(false);
  });

  it('should fail when age drift exceeds 1 second', () => {
    const committed = { ts: 946772400000, arrivalTs: 946781040000, eventAge: 25 * 31536000 + 5 };
    const target = { ts: 946772400000, arrivalTs: 946781040000, eventAge: 25 * 31536000, id: 'test6' };
    const result = verifySpanCoordinates(committed, target);
    expect(result.verified).toBe(false);
    expect(result.driftAge).toBe(5);
  });

  it('should pass for level events with identical timestamps', () => {
    const committed = { ts: 946772400000, arrivalTs: 946772400000, eventAge: 25 * 31536000 };
    const target = { ts: 946772400000, arrivalTs: 946772400000, eventAge: 25 * 31536000, id: 'test7' };
    const result = verifySpanCoordinates(committed, target);
    expect(result.verified).toBe(true);
  });
});