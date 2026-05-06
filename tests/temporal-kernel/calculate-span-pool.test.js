import { describe, it, expect } from 'vitest';
import { calculateSpanPool } from '/systems/continuum-v2/modules/temporal-kernel/calculate-span-pool.js';

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
    // Span level 1 = 1 year = 31536000 seconds
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

  it('should accumulate span displacement in cycle', () => {
    // Span level 1 = 1 year pool
    // Event 1: level at year 1 from genesis (no cost)
    // Event 2: span from year 1 to year 1.5 = 0.5 year displacement
    // Event 3: level at year 1.5 (no cost)
    const halfYearMs = YEAR_MS / 2;
    const result = calculateSpanPool({
      spanLevel: 1,
      events: [
        { id: 'e1', eventIsSpan: false, eventIsRest: false, ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS },
        { id: 'e2', eventIsSpan: true, eventIsRest: false, ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS + halfYearMs },
        { id: 'e3', eventIsSpan: false, eventIsRest: false, ts: GENESIS_TS + YEAR_MS + halfYearMs, arrivalTs: GENESIS_TS + YEAR_MS + halfYearMs }
      ],
      genesisTs: GENESIS_TS
    });
    // Half year in seconds = 15768000
    expect(result.spentInCycleSeconds).toBeCloseTo(15768000, -1);
    expect(result.remainingSeconds).toBeCloseTo(15768000, -1);
    expect(result.isOverSpan).toBe(false);
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
    // Span level 2 pool = 10 years = 315360000 seconds
    // Remaining after second span: 315360000 - 31536000 = 283824000
    expect(result.isOverSpan).toBe(false);
  });

  it('should detect over-span', () => {
    // Span level 1 = 1 year = 31536000 seconds pool
    // Span 2 years = over budget
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
    // 1 year = 31536000 seconds -> "1y"
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
    // Span level 3 = 100 years = 3153600000 seconds
    expect(result.maxPoolSeconds).toBe(3153600000);
    expect(result.eventStats).toHaveLength(0);
    expect(result.remainingSeconds).toBe(3153600000);
  });

  it('should compute per-event remaining after each span', () => {
    // Span level 2 = 10 years = 315360000 seconds
    // Level event at year 5 establishes lastTs = 5 * YEAR_MS from genesis
    // Then span jumps 0.25 years from year 5
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
    // Quarter year displacement = 7884000 seconds
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
    // After rest, cycle is reset so remaining should be full pool
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
});