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

/*
 * REGRESSION: Editing the span arrival under the NOW node must update
 * objectiveNow to the new arrivalTs. Without the NOW sync in
 * handle-submit.js, objectiveNow retains the OLD arrival time after
 * editing, causing the NOW node to drift away from the last event.
 *
 * The Kernel rule is simple: computeNowPosition(span record) = arrivalTs.
 * When editing the last event, the orchestration layer must call
 * computeNowPosition on the updated record and write the result to
 * system.personal.objectiveNow.
 */
describe('computeNowPosition: NOW sync regression', () => {
  // Simulate editing span arrival year up by 1 (365.25 days in ms)
  const MS_PER_YEAR = 31557600000;

  it('should point NOW to updated arrivalTs after span arrival edit', () => {
    const oldArrivalTs = 946781040000;
    const newArrivalTs = oldArrivalTs + MS_PER_YEAR;
    const updatedRecord = {
      eventIsSpan: true,
      ts: 946772400000,
      arrivalTs: newArrivalTs,
      eventAge: 25 * 31536000
    };
    const nowPos = computeNowPosition(updatedRecord);
    // NOW must move to the new arrival time, not stay at the old one
    expect(nowPos.objectiveNow).toBe(newArrivalTs);
    expect(nowPos.objectiveNow).not.toBe(oldArrivalTs);
  });

  it('should point NOW to ts after level event edit', () => {
    const newTs = 946772400000 + MS_PER_YEAR;
    const updatedRecord = {
      eventIsSpan: false,
      ts: newTs,
      arrivalTs: newTs,
      eventAge: 26 * 31536000
    };
    const nowPos = computeNowPosition(updatedRecord);
    expect(nowPos.objectiveNow).toBe(newTs);
  });

  it('must NOT use departure time for span events', () => {
    // When a span event is the last event, NOW is at arrival, NOT departure
    const spanRecord = {
      eventIsSpan: true,
      ts: 1000000,
      arrivalTs: 2000000,
      eventAge: 5000
    };
    const nowPos = computeNowPosition(spanRecord);
    // NOW must be at arrival (2000000), not at departure (1000000)
    expect(nowPos.objectiveNow).toBe(2000000);
    expect(nowPos.objectiveNow).not.toBe(1000000);
  });
});