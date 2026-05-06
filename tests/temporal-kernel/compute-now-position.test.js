import { describe, it, expect } from 'vitest';
import { computeNowPosition } from '/systems/continuum-v2/modules/temporal-kernel/compute-now-position.js';

describe('computeNowPosition', () => {
  it('should return ts for level events', () => {
    const atomic = {
      eventIsSpan: false,
      ts: 946772400000,
      arrivalTs: 946772400000,
      eventAge: 25 * 31536000
    };
    const result = computeNowPosition(atomic);
    expect(result.objectiveNow).toBe(946772400000);
    expect(result.subjectiveNow).toBe(25 * 31536000);
  });

  it('should return arrivalTs for span events', () => {
    const atomic = {
      eventIsSpan: true,
      ts: 946772400000,
      arrivalTs: 946781040000,
      eventAge: 25 * 31536000
    };
    const result = computeNowPosition(atomic);
    expect(result.objectiveNow).toBe(946781040000);
    expect(result.subjectiveNow).toBe(25 * 31536000);
  });

  it('should handle level event where ts === arrivalTs', () => {
    const atomic = {
      eventIsSpan: false,
      ts: 1000000,
      arrivalTs: 1000000,
      eventAge: 1000
    };
    const result = computeNowPosition(atomic);
    expect(result.objectiveNow).toBe(1000000);
  });

  it('should handle span event where ts differs from arrivalTs', () => {
    const atomic = {
      eventIsSpan: true,
      ts: 1000000,
      arrivalTs: 2000000,
      eventAge: 5000
    };
    const result = computeNowPosition(atomic);
    expect(result.objectiveNow).toBe(2000000);
  });
});