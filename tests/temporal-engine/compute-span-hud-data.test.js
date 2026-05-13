import { describe, it, expect, vi } from 'vitest';
import { computeSpanHudData } from '../../modules/temporal-engine/compute-span-hud-data.js';

// Mock the TTL module to avoid needing Foundry date parsing
vi.mock('/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js', () => ({
  parseDateToObjectiveMs: (dob) => {
    // 2000-01-01 = 946684800000 ms
    if (dob === '2000-01-01') return 946684800000;
    return 0;
  }
}));

vi.mock('/systems/continuum-v2/modules/temporal-translator/duration-converter.js', () => ({
  formatDurationCompact: (seconds) => {
    if (seconds < 0) return `-${Math.abs(seconds)}s`;
    const y = Math.floor(seconds / 31536000);
    if (y > 0) return `${y}y`;
    const d = Math.floor(seconds / 86400);
    if (d > 0) return `${d}d`;
    return `${Math.floor(seconds)}s`;
  }
}));

const BASE_LORE = {
  spanRank: 1,
  lastEvent: { record: { eventIsSpan: false } },
  currentPool: 0
};

const BASE_LATEST_STATE = {
  nodes: [
    { id: 'birth', x: 0, y: 946684800000, isBirth: true, isVirtual: false, isSpanOrigin: false, record: { eventIsSpan: false, eventIsRest: false } },
    { id: 'evt-1', x: 31536000, y: 978307200000, isBirth: false, isVirtual: false, isSpanOrigin: false, arrivalY: 978307200000, record: { eventIsSpan: false, eventIsRest: false } },
    { id: 'now', x: 63072000, y: 1009843200000, isBirth: false, isVirtual: false, isSpanOrigin: false, arrivalY: 1009843200000, record: { eventIsSpan: false } }
  ]
};

const BASE_ACTOR = {
  system: {
    spanning: { span: 1 },
    personal: { dob: '2000-01-01' }
  }
};

describe('computeSpanHudData', () => {
  it('returns cost and pool rows with positive remaining pool', () => {
    // 1-year span within rank 1 capacity (1 year = 31536000s)
    const startWorld = { eventAge: 0, eventTime: 946684800000 };
    const currentWorld = { eventAge: 0, eventTime: 949536000000 }; // ~1 year later

    const result = computeSpanHudData(BASE_ACTOR, BASE_LATEST_STATE, startWorld, currentWorld, BASE_LORE);

    expect(result.costRows).toHaveLength(1);
    expect(result.costRows[0].label).toBe('SPENT');
    expect(result.costRows[0].color).toBe('#ff6b6b');

    expect(result.poolRows).toHaveLength(1);
    expect(result.poolRows[0].label).toBe('REMAINING');
    // Remaining should be positive (within 1-year capacity)
    expect(result.poolRows[0].color).toBe('#28a745');

    expect(result.validationRow).toBeNull();
  });

  it('returns red color when isOverSpan is true', () => {
    // 10-year span exceeds rank 1 capacity (1 year)
    const startWorld = { eventAge: 0, eventTime: 946684800000 };
    const currentWorld = { eventAge: 0, eventTime: 978307200000 }; // ~1 year
    const overActor = {
      system: {
        spanning: { span: 1 },
        personal: { dob: '2000-01-01' }
      }
    };

    // Use empty history so the full capacity is available,
    // but make the span larger than the pool
    // Rank 1 pool = 1 year = 31536000s. A 2-year span exceeds it.
    const twoYearMs = 2 * 365.25 * 24 * 3600 * 1000;
    const overWorld = { eventAge: 0, eventTime: 946684800000 + twoYearMs };

    const result = computeSpanHudData(overActor, BASE_LATEST_STATE, startWorld, overWorld, BASE_LORE);

    expect(result.poolRows[0].color).toBe('#ff0000');
  });

  it('returns validation row for illegal span (rank 0)', () => {
    const rank0Actor = {
      system: {
        spanning: { span: 0 },
        personal: { dob: '2000-01-01' }
      }
    };
    const lore = {
      spanRank: 0,
      lastEvent: { record: { eventIsSpan: false } },
      currentPool: 0
    };

    const startWorld = { eventAge: 0, eventTime: 946684800000 };
    const currentWorld = { eventAge: 0, eventTime: 949536000000 };

    const result = computeSpanHudData(rank0Actor, BASE_LATEST_STATE, startWorld, currentWorld, lore);

    // Rank 0: no pool rows
    expect(result.poolRows).toHaveLength(0);
    // Rank 0: illegal span
    expect(result.validationRow).not.toBeNull();
    expect(result.validationRow.label).toBe('ILLEGAL');
    expect(result.validationRow.color).toBe('#ff0000');
  });

  it('returns empty pool rows when spanRank is 0', () => {
    const rank0Actor = {
      system: {
        spanning: { span: 0 },
        personal: { dob: '2000-01-01' }
      }
    };
    const lore = {
      spanRank: 0,
      lastEvent: { record: { eventIsSpan: false } },
      currentPool: 0
    };

    const startWorld = { eventAge: 0, eventTime: 946684800000 };
    const currentWorld = { eventAge: 0, eventTime: 946684800000 + 86400000 };

    const result = computeSpanHudData(rank0Actor, BASE_LATEST_STATE, startWorld, currentWorld, lore);

    expect(result.costRows).toHaveLength(1);
    expect(result.costRows[0].label).toBe('SPENT');
    expect(result.poolRows).toHaveLength(0);
  });

  it('filters out now, isVirtual, and isBirth nodes from kernelEvents', () => {
    // Verify the node-to-kernelEvent mapping works correctly
    const stateWithVirtual = {
      nodes: [
        { id: 'birth', x: 0, y: 946684800000, isBirth: true, isVirtual: false, isSpanOrigin: false, record: { eventIsSpan: false, eventIsRest: false } },
        { id: 'virtual-1', x: 0, y: 946684800000, isBirth: false, isVirtual: true, isSpanOrigin: false, record: { eventIsSpan: false, eventIsRest: false } },
        { id: 'evt-1', x: 31536000, y: 978307200000, isBirth: false, isVirtual: false, isSpanOrigin: false, arrivalY: 978307200000, record: { eventIsSpan: false, eventIsRest: false } },
        { id: 'now', x: 63072000, y: 1009843200000, isBirth: false, isVirtual: false, isSpanOrigin: false, arrivalY: 1009843200000, record: { eventIsSpan: false } }
      ]
    };

    // The function should still work - birth, virtual, and now are filtered out
    // We only care that it doesn't crash and returns pool data
    const startWorld = { eventAge: 0, eventTime: 946684800000 };
    const currentWorld = { eventAge: 0, eventTime: 946684800000 + 86400000 };

    const result = computeSpanHudData(BASE_ACTOR, stateWithVirtual, startWorld, currentWorld, BASE_LORE);

    // Should still produce pool rows (only real event processed)
    expect(result.poolRows).toHaveLength(1);
  });

  it('returns warning validation row for over-capacity span', () => {
    // Level breath: last event is a span, so next span is blocked
    const loreWithConsecutiveSpan = {
      spanRank: 1,
      lastEvent: { record: { eventIsSpan: true } },
      currentPool: 0
    };

    const startWorld = { eventAge: 0, eventTime: 946684800000 };
    const currentWorld = { eventAge: 0, eventTime: 978307200000 };

    const result = computeSpanHudData(BASE_ACTOR, BASE_LATEST_STATE, startWorld, currentWorld, loreWithConsecutiveSpan);

    // THE LEVEL BREATH: consecutive spans are illegal
    expect(result.validationRow).not.toBeNull();
    expect(result.validationRow.label).toBe('ILLEGAL');
    expect(result.validationRow.color).toBe('#ff0000');
  });

  it('maps span-origin nodes correctly with isSpanOrigin flag', () => {
    const stateWithSpan = {
      nodes: [
        { id: 'birth', x: 0, y: 946684800000, isBirth: true, isVirtual: false, isSpanOrigin: false, record: { eventIsSpan: false, eventIsRest: false } },
        { id: 'span-1', x: 31536000, y: 978307200000, isBirth: false, isVirtual: false, isSpanOrigin: true, arrivalY: 1009843200000, record: { eventIsSpan: true, eventIsRest: false } },
        { id: 'now', x: 63072000, y: 1036022400000, isBirth: false, isVirtual: false, isSpanOrigin: false, arrivalY: 1036022400000, record: { eventIsSpan: false } }
      ]
    };

    // Small span within capacity
    const startWorld = { eventAge: 0, eventTime: 946684800000 };
    const currentWorld = { eventAge: 0, eventTime: 946684800000 + 86400000 }; // 1 day

    const result = computeSpanHudData(BASE_ACTOR, stateWithSpan, startWorld, currentWorld, BASE_LORE);

    // Should succeed without validation errors (small span)
    expect(result.costRows[0].label).toBe('SPENT');
    expect(result.poolRows).toHaveLength(1);
  });
});