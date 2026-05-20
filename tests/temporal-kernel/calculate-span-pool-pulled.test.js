import { describe, it, expect } from 'vitest';
import { calculateSpanPool, computeSpanCost, computePoolAfterSpan } from '/systems/continuum-v2/modules/temporal-kernel/calculate-span-pool.js';
import { classifyEventType } from '/systems/continuum-v2/modules/temporal-kernel/classify-event-type.js';

// Genesis timestamp: 2000-01-01T12:00:00 = 946772400000 ms
const GENESIS_TS = 946772400000;
// One year in ms
const YEAR_MS = 31536000000;

describe('calculateSpanPool - pulled spans', () => {
  // PULLED SPAN: A span where another spanner carried this character
  // through time. The displacement is real (it happened on the timeline)
  // but the pool cost is zero. The puller's pool pays instead.

  it('pulled span costs zero from pool', () => {
    // Character is pulled 5 years by a higher-rank spanner.
    // Pool remains full.
    const result = calculateSpanPool({
      spanLevel: 1,
      events: [
        { id: 'e1', eventIsSpan: true, isPulled: true, eventIsRest: false,
          ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS * 6 }
      ],
      genesisTs: GENESIS_TS
    });
    // Span cost is 5 years, but pulled -> pool unchanged
    expect(result.eventStats[0].spentSeconds).toBeCloseTo(5 * 31536000, -1);
    expect(result.eventStats[0].isPulled).toBe(true);
    expect(result.eventStats[0].spentFormatted).toContain('PULLED');
    expect(result.spentInCycleSeconds).toBe(0);
    expect(result.remainingSeconds).toBeCloseTo(31536000, -1);
    expect(result.isOverSpan).toBe(false);
  });

  it('mix of pulled and self-spanned events: only self-spans consume pool', () => {
    // Character spans 0.5 years on their own, then is pulled 2 years,
    // then spans another 0.3 years on their own.
    const result = calculateSpanPool({
      spanLevel: 1,
      events: [
        { id: 's1', eventIsSpan: true, isPulled: false, eventIsRest: false,
          ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS * 1.5 },
        { id: 's2', eventIsSpan: true, isPulled: true, eventIsRest: false,
          ts: GENESIS_TS + YEAR_MS * 1.5, arrivalTs: GENESIS_TS + YEAR_MS * 3.5 },
        { id: 's3', eventIsSpan: true, isPulled: false, eventIsRest: false,
          ts: GENESIS_TS + YEAR_MS * 3.5, arrivalTs: GENESIS_TS + YEAR_MS * 3.8 }
      ],
      genesisTs: GENESIS_TS
    });
    // Only self-spans count: 0.5y + 0.3y = 0.8y
    const halfYear = 31536000 / 2;
    const thirdYear = 31536000 * 0.3;
    expect(result.spentInCycleSeconds).toBeCloseTo(halfYear + thirdYear, -1);
    // Pulled span still shows displacement
    expect(result.eventStats[1].isPulled).toBe(true);
    expect(result.eventStats[1].spentFormatted).toContain('PULLED');
    // Self spans show normal cost
    expect(result.eventStats[0].isPulled).toBe(false);
    expect(result.eventStats[2].isPulled).toBe(false);
  });

  it('pulled span followed by rest: rest resets but pool was already full', () => {
    // Character is pulled 3 years, rests, then self-spans 0.5 years.
    // Pool should be full after the pulled span (it cost nothing).
    const result = calculateSpanPool({
      spanLevel: 1,
      events: [
        { id: 'p1', eventIsSpan: true, isPulled: true, eventIsRest: false,
          ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS * 4 },
        { id: 'r1', eventIsSpan: false, isPulled: false, eventIsRest: true,
          ts: GENESIS_TS + YEAR_MS * 4, arrivalTs: GENESIS_TS + YEAR_MS * 4 },
        { id: 's1', eventIsSpan: true, isPulled: false, eventIsRest: false,
          ts: GENESIS_TS + YEAR_MS * 4, arrivalTs: GENESIS_TS + YEAR_MS * 4.5 }
      ],
      genesisTs: GENESIS_TS
    });
    // After pulled span: pool is still full (1y)
    // After rest: pool resets (still full)
    // After self-span: 0.5y consumed
    const halfYear = 31536000 / 2;
    expect(result.spentInCycleSeconds).toBeCloseTo(halfYear, -1);
    expect(result.isOverSpan).toBe(false);
  });

  it('pulled span does not prevent overspan from later self-spans', () => {
    // Span level 1 = 1 year pool. Character self-spans 0.8 years,
    // then is pulled 5 years (no pool cost), then tries to self-span
    // another 0.5 years. Total pool consumption: 0.8 + 0.5 = 1.3 > 1.0.
    const result = calculateSpanPool({
      spanLevel: 1,
      events: [
        { id: 's1', eventIsSpan: true, isPulled: false, eventIsRest: false,
          ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS * 1.8 },
        { id: 'p1', eventIsSpan: true, isPulled: true, eventIsRest: false,
          ts: GENESIS_TS + YEAR_MS * 1.8, arrivalTs: GENESIS_TS + YEAR_MS * 6.8 },
        { id: 's2', eventIsSpan: true, isPulled: false, eventIsRest: false,
          ts: GENESIS_TS + YEAR_MS * 6.8, arrivalTs: GENESIS_TS + YEAR_MS * 7.3 }
      ],
      genesisTs: GENESIS_TS
    });
    // Self-span cost: 0.8y + 0.5y = 1.3y > 1.0y pool
    expect(result.isOverSpan).toBe(true);
    expect(result.spentInCycleSeconds).toBeCloseTo(1.3 * 31536000, -1);
  });

  it('all pulled spans with no self-spans: pool remains full', () => {
    // Character is entirely carried through time by other spanners.
    const result = calculateSpanPool({
      spanLevel: 2,
      events: [
        { id: 'p1', eventIsSpan: true, isPulled: true, eventIsRest: false,
          ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS * 5 },
        { id: 'p2', eventIsSpan: true, isPulled: true, eventIsRest: false,
          ts: GENESIS_TS + YEAR_MS * 5, arrivalTs: GENESIS_TS + YEAR_MS * 8 }
      ],
      genesisTs: GENESIS_TS
    });
    expect(result.spentInCycleSeconds).toBe(0);
    expect(result.remainingSeconds).toBeCloseTo(315360000, -1);
    expect(result.isOverSpan).toBe(false);
    // Each pulled span still shows its displacement
    expect(result.eventStats[0].isPulled).toBe(true);
    expect(result.eventStats[1].isPulled).toBe(true);
  });

  it('isPulled undefined defaults to false (backward compat)', () => {
    // Events without isPulled field should behave as self-spanned.
    const result = calculateSpanPool({
      spanLevel: 1,
      events: [
        { id: 's1', eventIsSpan: true, eventIsRest: false,
          ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS * 2 }
      ],
      genesisTs: GENESIS_TS
    });
    expect(result.eventStats[0].isPulled).toBe(false);
    expect(result.spentInCycleSeconds).toBeCloseTo(31536000, -1);
  });

  it('isPulled false on a span still costs pool normally', () => {
    const result = calculateSpanPool({
      spanLevel: 1,
      events: [
        { id: 's1', eventIsSpan: true, isPulled: false, eventIsRest: false,
          ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS * 2 }
      ],
      genesisTs: GENESIS_TS
    });
    expect(result.eventStats[0].isPulled).toBe(false);
    expect(result.spentInCycleSeconds).toBeCloseTo(31536000, -1);
  });

  it('isPulled on a level event passes through but has no effect on pool', () => {
    // A level event with isPulled: true - the flag passes through but
    // has no effect since level events don't cost pool anyway.
    // classifyEventType forces isPulled to false for level events;
    // but calculateSpanPool just passes the raw value through.
    const result = calculateSpanPool({
      spanLevel: 1,
      events: [
        { id: 'e1', eventIsSpan: false, isPulled: true, eventIsRest: false,
          ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS }
      ],
      genesisTs: GENESIS_TS
    });
    // isPulled is truthy but meaningless for a level event
    expect(result.eventStats[0].isPulled).toBe(true);
    // No pool consumed regardless
    expect(result.spentInCycleSeconds).toBe(0);
  });
});

describe('computePoolAfterSpan - pulled spans in existing events', () => {
  it('pulled span in existing history does not consume pool for proposed span', () => {
    // Character was pulled 2 years, then proposes a 0.5 year self-span.
    // Pool should be nearly full (only 0.5y consumed).
    const halfYearMs = YEAR_MS / 2;
    const result = computePoolAfterSpan({
      spanLevel: 1,
      events: [
        { id: 'p1', eventIsSpan: true, isPulled: true, eventIsRest: false,
          ts: GENESIS_TS + YEAR_MS, arrivalTs: GENESIS_TS + YEAR_MS * 3 }
      ],
      genesisTs: GENESIS_TS,
      proposedDepartureMs: GENESIS_TS + YEAR_MS * 3,
      proposedArrivalMs: GENESIS_TS + YEAR_MS * 3 + halfYearMs
    });
    // Pulled span cost 0, proposed self-span costs 0.5y, remaining = 0.5y
    expect(result.costSeconds).toBeCloseTo(15768000, -1);
    expect(result.remainingSeconds).toBeCloseTo(15768000, -1);
    expect(result.isOverSpan).toBe(false);
  });
});

describe('calculateDisplacementPool - pulled spans', () => {
  // Import inline since it's a separate module
  // Note: displacement pool uses physicalNodes, not flat events.
  // isPulled is carried on the record or directly on the node.

  it('should skip pulled spans in displacement calculation', async () => {
    const { calculateDisplacementPool } = await import('/systems/continuum-v2/modules/temporal-kernel/calculate-displacement-pool.js');

    const nodes = [
      { y: 946772400000, arrivalY: 946772400000, isSpanOrigin: false, record: { eventIsSpan: false, eventIsRest: false } },
      { y: 946772400000 + YEAR_MS, arrivalY: 946772400000 + YEAR_MS * 3, isSpanOrigin: true, isPulled: true, record: { eventIsSpan: true, isPulled: true, eventIsRest: false } },
      { y: 946772400000 + YEAR_MS * 3, arrivalY: 946772400000 + YEAR_MS * 3, isSpanOrigin: false, record: { eventIsSpan: false, eventIsRest: false } }
    ];

    const displacement = calculateDisplacementPool(nodes);
    expect(displacement).toBe(0);
  });

  it('should count self-spanned but skip pulled in mixed scenario', async () => {
    const { calculateDisplacementPool } = await import('/systems/continuum-v2/modules/temporal-kernel/calculate-displacement-pool.js');

    const nodes = [
      { y: 946772400000, arrivalY: 946772400000, isSpanOrigin: false, record: { eventIsSpan: false, eventIsRest: false } },
      { y: 946772400000 + YEAR_MS, arrivalY: 946772400000 + YEAR_MS * 3, isSpanOrigin: true, isPulled: true, record: { eventIsSpan: true, isPulled: true, eventIsRest: false } },
      { y: 946772400000 + YEAR_MS * 3, arrivalY: 946772400000 + YEAR_MS * 3, isSpanOrigin: false, record: { eventIsSpan: false, eventIsRest: false } },
      { y: 946772400000 + YEAR_MS * 3, arrivalY: 946772400000 + YEAR_MS * 4, isSpanOrigin: true, record: { eventIsSpan: true, isPulled: false, eventIsRest: false } }
    ];

    // Only the self-span (1 year displacement) should count
    const displacement = calculateDisplacementPool(nodes);
    expect(displacement).toBeCloseTo(YEAR_MS, -1);
  });
});

describe('classifyEventType - isPulled', () => {
  it('isPulled true with eventIsSpan true -> isPulled true', () => {
    const { isPulled, eventIsSpan } = classifyEventType({
      eventIsSpan: true,
      isPulled: true,
      eventSpanFromDate: '2020-01-01',
      eventSpanToDate: '2025-06-15',
      eventSpanFromTime: '12:00:00',
      eventSpanToTime: '16:00:00',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: 'London'
    }, { spanDisabled: false });

    expect(eventIsSpan).toBe(true);
    expect(isPulled).toBe(true);
  });

  it('isPulled false with eventIsSpan true -> isPulled false', () => {
    const { isPulled } = classifyEventType({
      eventIsSpan: true,
      isPulled: false,
      eventSpanFromDate: '2020-01-01',
      eventSpanToDate: '2025-06-15',
      eventSpanFromTime: '12:00:00',
      eventSpanToTime: '16:00:00',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: 'London'
    }, { spanDisabled: false });

    expect(isPulled).toBe(false);
  });

  // BOUNDARY-TRACE: isPulled forces to false when not a span,
  // mirroring the spanDisabled -> eventIsSpan pattern.
  it('isPulled true with eventIsSpan false -> isPulled forced to false', () => {
    const { isPulled, eventIsSpan } = classifyEventType({
      eventIsSpan: false,
      isPulled: true,
      eventSpanFromDate: '2020-01-01',
      eventSpanToDate: '2020-01-01',
      eventSpanFromTime: '12:00:00',
      eventSpanToTime: '12:00:00',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: 'London'
    }, { spanDisabled: false });

    expect(eventIsSpan).toBe(false);
    expect(isPulled).toBe(false);
  });

  it('isPulled undefined defaults to false', () => {
    const { isPulled } = classifyEventType({
      eventIsSpan: true,
      eventSpanFromDate: '2020-01-01',
      eventSpanToDate: '2025-06-15',
      eventSpanFromTime: '12:00:00',
      eventSpanToTime: '16:00:00',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: 'London'
    }, { spanDisabled: false });

    expect(isPulled).toBe(false);
  });

  it('isPulled forced to false when spanDisabled true (mirrors eventIsSpan veto)', () => {
    const { isPulled, eventIsSpan } = classifyEventType({
      eventIsSpan: true,
      isPulled: true,
      eventSpanFromDate: '2020-01-01',
      eventSpanToDate: '2025-06-15',
      eventSpanFromTime: '12:00:00',
      eventSpanToTime: '16:00:00',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: 'London'
    }, { spanDisabled: true });

    expect(eventIsSpan).toBe(false);
    expect(isPulled).toBe(false);
  });

  it('normalizedFacts includes isPulled', () => {
    const { normalizedFacts } = classifyEventType({
      eventIsSpan: true,
      isPulled: true,
      eventSpanFromDate: '2020-01-01',
      eventSpanToDate: '2025-06-15',
      eventSpanFromTime: '12:00:00',
      eventSpanToTime: '16:00:00',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: 'London'
    }, { spanDisabled: false });

    expect(normalizedFacts.isPulled).toBe(true);
  });
});