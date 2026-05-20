import { describe, it, expect } from 'vitest';
import { calculateSpanPool, getCurrentSpanCapacity, computeSpanCost, computePoolAfterSpan } from '/systems/continuum-v2/modules/temporal-kernel/calculate-span-pool.js';

// Genesis timestamp: 2000-01-01T12:00:00 = 946772400000 ms
const GENESIS_TS = 946772400000;
// One year in ms
const YEAR_MS = 31536000000;
// One day in ms
const DAY_MS = 86400000;

describe('calculateSpanPool', () => {
  it('should return zero pool for span level 0 (leveller)', () => {
    const result = calculateSpanPool({
      spanLevel: 0,
      events: [],
      genesisTs: GENESIS_TS
    });
    expect(result.maxPoolSeconds).toBe(0);
    expect(result.remainingSeconds).toBe(0);
    expect(result.isOverSpan).toBe(false);
    expect(result.spanTimeRemainingFormatted).toBe('0s');
    expect(result.eventStats).toHaveLength(0);
  });

  it('should return full pool remaining when there are no span events', () => {
    const result = calculateSpanPool({
      spanLevel: 1,
      events: [
        { id: 'e1', eventIsSpan: false, eventIsRest: false, ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS }
      ],
      genesisTs: GENESIS_TS
    });
    expect(result.maxPoolSeconds).toBe(31536000);
    expect(result.remainingSeconds).toBe(31536000);
    expect(result.isOverSpan).toBe(false);
    expect(result.eventStats[0].spentFormatted).toBe('0s (Leveling)');
  });

  it('should accumulate span cost as |arrivalTs - ts|, NOT |arrivalTs - lastEvent|', () => {
    // CRITICAL REGRESSION TEST: Span cost is the span's OWN displacement
    // (arrival minus departure), NOT the gap from the previous event.
    //
    // Scenario: Character levels for 5 years, then spans 0.5 years forward.
    // The span departs at year 5 and arrives at year 5.5.
    // Span cost = 0.5 years (arrival - departure), NOT 5.5 years (arrival - genesis).
    const fiveYearsMs = YEAR_MS * 5;
    const halfYearMs = YEAR_MS / 2;
    const result = calculateSpanPool({
      spanLevel: 1,
      events: [
        { id: 'e1', eventIsSpan: false, eventIsRest: false, ts: GENESIS_TS + fiveYearsMs, arrivalTs: GENESIS_TS + fiveYearsMs },
        { id: 'e2', eventIsSpan: true, eventIsRest: false, ts: GENESIS_TS + fiveYearsMs, arrivalTs: GENESIS_TS + fiveYearsMs + halfYearMs }
      ],
      genesisTs: GENESIS_TS
    });
    // Span cost = 0.5 years = 15768000 seconds
    expect(result.spentInCycleSeconds).toBeCloseTo(15768000, -1);
    // Remaining = 1 year - 0.5 year = 0.5 year = 15768000 seconds
    expect(result.remainingSeconds).toBeCloseTo(15768000, -1);
    expect(result.isOverSpan).toBe(false);
  });

  it('should compute span cost correctly when spans skip backward', () => {
    // A span that jumps backward in time still costs the absolute displacement.
    // Span departs year 5, arrives year 3 (2 year cost, backward).
    const fiveYearsMs = YEAR_MS * 5;
    const twoYearsMs = YEAR_MS * 2;
    const result = calculateSpanPool({
      spanLevel: 2,
      events: [
        { id: 'e1', eventIsSpan: true, eventIsRest: false, ts: GENESIS_TS + fiveYearsMs, arrivalTs: GENESIS_TS + fiveYearsMs - twoYearsMs }
      ],
      genesisTs: GENESIS_TS
    });
    // Cost = 2 years = 63072000 seconds (absolute value)
    expect(result.spentInCycleSeconds).toBeCloseTo(63072000, -1);
  });

  it('should reset cycle on rest event', () => {
    const result = calculateSpanPool({
      spanLevel: 2,
      events: [
        { id: 'e1', eventIsSpan: true, eventIsRest: false, ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS * 2 },
        { id: 'e2', eventIsSpan: false, eventIsRest: true, ts: GENESIS_TS + YEAR_MS * 2, arrivalTs: GENESIS_TS + YEAR_MS * 2 },
        { id: 'e3', eventIsSpan: true, eventIsRest: false, ts: GENESIS_TS + YEAR_MS * 2, arrivalTs: GENESIS_TS + YEAR_MS * 3 }
      ],
      genesisTs: GENESIS_TS
    });
    // After rest, cycle resets. Second span is a fresh cycle.
    // First span cost: 1 year = 31536000 seconds
    // Rest resets
    // Second span cost: 1 year = 31536000 seconds
    expect(result.spentInCycleSeconds).toBeCloseTo(31536000, -1);
    expect(result.isOverSpan).toBe(false);
  });

  it('should detect over-span', () => {
    const result = calculateSpanPool({
      spanLevel: 1,
      events: [
        { id: 'e1', eventIsSpan: true, eventIsRest: false, ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS * 3 }
      ],
      genesisTs: GENESIS_TS
    });
    // 2 years displacement = 63072000 seconds > 31536000 pool
    expect(result.isOverSpan).toBe(true);
    expect(result.remainingSeconds).toBeLessThan(0);
  });

  it('should format remaining time using TTL compact format', () => {
    const result = calculateSpanPool({
      spanLevel: 1,
      events: [],
      genesisTs: GENESIS_TS
    });
    expect(result.spanTimeRemainingFormatted).toBe('1y');
  });

  it('should format level events as "0s (Leveling)"', () => {
    const result = calculateSpanPool({
      spanLevel: 2,
      events: [
        { id: 'e1', eventIsSpan: false, eventIsRest: false, ts: GENESIS_TS + DAY_MS, arrivalTs: GENESIS_TS + DAY_MS }
      ],
      genesisTs: GENESIS_TS
    });
    expect(result.eventStats[0].spentFormatted).toBe('0s (Leveling)');
  });

  it('should handle empty events list', () => {
    const result = calculateSpanPool({
      spanLevel: 3,
      events: [],
      genesisTs: GENESIS_TS
    });
    expect(result.maxPoolSeconds).toBe(3153600000);
    expect(result.eventStats).toHaveLength(0);
    expect(result.remainingSeconds).toBe(3153600000);
  });

  it('should compute per-event remaining after each span', () => {
    const fiveYearsMs = YEAR_MS * 5;
    const quarterYearMs = YEAR_MS / 4;
    const result = calculateSpanPool({
      spanLevel: 2,
      events: [
        { id: 'e1', eventIsSpan: false, eventIsRest: false, ts: GENESIS_TS + fiveYearsMs, arrivalTs: GENESIS_TS + fiveYearsMs },
        { id: 'e2', eventIsSpan: true, eventIsRest: false, ts: GENESIS_TS + fiveYearsMs, arrivalTs: GENESIS_TS + fiveYearsMs + quarterYearMs }
      ],
      genesisTs: GENESIS_TS
    });
    // Quarter year cost = 7884000 seconds
    expect(result.eventStats[1].spentSeconds).toBeCloseTo(7884000, -1);
    expect(result.remainingSeconds).toBeCloseTo(315360000 - 7884000, -2);
  });

  it('should report isRest in eventStats for rest events', () => {
    const result = calculateSpanPool({
      spanLevel: 1,
      events: [
        { id: 'e1', eventIsSpan: true, eventIsRest: false, ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS * 2 },
        { id: 'e2', eventIsSpan: false, eventIsRest: true, ts: GENESIS_TS + YEAR_MS * 2, arrivalTs: GENESIS_TS + YEAR_MS * 2 }
      ],
      genesisTs: GENESIS_TS
    });
    expect(result.eventStats[0].isSpan).toBe(true);
    expect(result.eventStats[0].isRest).toBe(false);
    expect(result.eventStats[1].isSpan).toBe(false);
    expect(result.eventStats[1].isRest).toBe(true);
    expect(result.eventStats[1].remainingAfterEvent).toBe(31536000);
  });

  it('should map span levels to correct pool sizes', () => {
    const levels = [0, 1, 2, 3, 4, 5];
    const expectedPools = [0, 31536000, 315360000, 3153600000, 31536000000, 315360000000];
    for (let i = 0; i < levels.length; i++) {
      const result = calculateSpanPool({ spanLevel: levels[i], events: [], genesisTs: GENESIS_TS });
      expect(result.maxPoolSeconds).toBe(expectedPools[i]);
    }
  });

  it('should handle unknown span level as 0 pool', () => {
    const result = calculateSpanPool({ spanLevel: 99, events: [], genesisTs: GENESIS_TS });
    expect(result.maxPoolSeconds).toBe(0);
  });

  it('should compute cost correctly for consecutive spans', () => {
    // REGRESSION: Two consecutive spans. Span 1 departs year 1, arrives year 2.
    // Span 2 departs year 2, arrives year 2.5. Each has its own cost.
    const result = calculateSpanPool({
      spanLevel: 2,
      events: [
        { id: 's1', eventIsSpan: true, eventIsRest: false, ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS * 2 },
        { id: 's2', eventIsSpan: true, eventIsRest: false, ts: GENESIS_TS + YEAR_MS * 2, arrivalTs: GENESIS_TS + YEAR_MS * 2 + YEAR_MS / 2 }
      ],
      genesisTs: GENESIS_TS
    });
    // Span 1 cost: 1 year = 31536000 seconds
    expect(result.eventStats[0].spentSeconds).toBeCloseTo(31536000, -1);
    // Span 2 cost: 0.5 year = 15768000 seconds
    expect(result.eventStats[1].spentSeconds).toBeCloseTo(15768000, -1);
    // Total spent: 1.5 years = 47304000 seconds
    expect(result.spentInCycleSeconds).toBeCloseTo(47304000, -1);
  });
});

describe('getCurrentSpanCapacity', () => {
  it('should return correct capacity for ranks 0-5', () => {
    expect(getCurrentSpanCapacity(0)).toBe(0);
    expect(getCurrentSpanCapacity(1)).toBe(31536000);
    expect(getCurrentSpanCapacity(2)).toBe(315360000);
    expect(getCurrentSpanCapacity(3)).toBe(3153600000);
    expect(getCurrentSpanCapacity(4)).toBe(31536000000);
    expect(getCurrentSpanCapacity(5)).toBe(315360000000);
  });

  it('should return 0 for invalid or unknown ranks', () => {
    expect(getCurrentSpanCapacity(99)).toBe(0);
    expect(getCurrentSpanCapacity(-1)).toBe(0);
    expect(getCurrentSpanCapacity(null)).toBe(0);
    expect(getCurrentSpanCapacity(undefined)).toBe(0);
  });
});

describe('computeSpanCost', () => {
  it('should return span cost in seconds', () => {
    // Depart at year 1, arrive at year 2 = 1 year = 31536000 seconds
    const cost = computeSpanCost({ ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS * 2 });
    expect(cost).toBeCloseTo(31536000, -1);
  });

  it('should return absolute cost for backward spans', () => {
    // Depart at year 5, arrive at year 3 = 2 year cost
    const cost = computeSpanCost({ ts: GENESIS_TS + YEAR_MS * 5, arrivalTs: GENESIS_TS + YEAR_MS * 3 });
    expect(cost).toBeCloseTo(63072000, -1);
  });

  it('should return 0 for null or invalid input', () => {
    expect(computeSpanCost(null)).toBe(0);
    expect(computeSpanCost(undefined)).toBe(0);
    expect(computeSpanCost({})).toBe(0);
  });

  it('should return 0 when both timestamps are 0', () => {
    expect(computeSpanCost({ ts: 0, arrivalTs: 0 })).toBe(0);
  });
});

describe('computePoolAfterSpan', () => {
  it('should project remaining after a proposed span', () => {
    // Level 1 = 1 year pool. Existing: 0 spent. Proposed: 0.5 year span.
    const result = computePoolAfterSpan({
      spanLevel: 1,
      events: [],
      genesisTs: GENESIS_TS,
      proposedDepartureMs: GENESIS_TS + YEAR_MS,
      proposedArrivalMs: GENESIS_TS + YEAR_MS + YEAR_MS / 2
    });
    expect(result.costSeconds).toBeCloseTo(15768000, -1);
    expect(result.remainingSeconds).toBeCloseTo(15768000, -1);
    expect(result.isOverSpan).toBe(false);
  });

  it('should detect over-span after proposed span', () => {
    // Level 1 = 1 year pool. Existing: 0.5 year spent. Proposed: 0.75 year span.
    const halfYearMs = YEAR_MS / 2;
    const result = computePoolAfterSpan({
      spanLevel: 1,
      events: [
        { id: 'e1', eventIsSpan: true, eventIsRest: false, ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS + halfYearMs }
      ],
      genesisTs: GENESIS_TS,
      proposedDepartureMs: GENESIS_TS + YEAR_MS + halfYearMs,
      proposedArrivalMs: GENESIS_TS + YEAR_MS + halfYearMs + YEAR_MS * 0.75
    });
    // Already spent 0.5y, proposed 0.75y = 1.25y total > 1y pool
    expect(result.isOverSpan).toBe(true);
    expect(result.remainingSeconds).toBeLessThan(0);
  });

  it('should account for rest resets in existing events', () => {
    // Level 1 = 1 year pool. Existing: 0.75y span, then rest (resets), then 0.25y span.
    // Current cycle spent = 0.25y. Proposed: 0.5y span.
    const threeQuartersMs = YEAR_MS * 0.75;
    const quarterMs = YEAR_MS * 0.25;
    const result = computePoolAfterSpan({
      spanLevel: 1,
      events: [
        { id: 's1', eventIsSpan: true, eventIsRest: false, ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS + threeQuartersMs },
        { id: 'r1', eventIsSpan: false, eventIsRest: true, ts: GENESIS_TS + YEAR_MS + threeQuartersMs, arrivalTs: GENESIS_TS + YEAR_MS + threeQuartersMs },
        { id: 's2', eventIsSpan: true, eventIsRest: false, ts: GENESIS_TS + YEAR_MS + threeQuartersMs, arrivalTs: GENESIS_TS + YEAR_MS + threeQuartersMs + quarterMs }
      ],
      genesisTs: GENESIS_TS,
      proposedDepartureMs: GENESIS_TS + YEAR_MS + threeQuartersMs + quarterMs,
      proposedArrivalMs: GENESIS_TS + YEAR_MS + threeQuartersMs + quarterMs + YEAR_MS / 2
    });
    // Current cycle: 0.25y. Proposed: 0.5y. Total: 0.75y. Pool: 1y. Remaining: 0.25y.
    expect(result.isOverSpan).toBe(false);
    expect(result.remainingSeconds).toBeCloseTo(7884000, -1);
  });
});