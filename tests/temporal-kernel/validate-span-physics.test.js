import { describe, it, expect } from 'vitest';
import { validateSpanPhysics } from '/systems/continuum-v2/modules/temporal-kernel/validate-span-physics.js';

describe('validateSpanPhysics', () => {
  const baseContext = {
    lastEvent: { record: { eventIsSpan: false } },
    spanRank: 1,
    currentPool: 0
  };

  it('should reject zero-displacement span (departure === arrival)', () => {
    const proposed = {
      y: 946772400000,
      arrivalY: 946772400000,
      record: { eventIsSpan: true }
    };
    const result = validateSpanPhysics(proposed, baseContext);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/nonzero displacement/);
  });

  it('should accept span with nonzero displacement', () => {
    const proposed = {
      y: 946772400000,
      arrivalY: 946772400000 + 86400000,
      record: { eventIsSpan: true }
    };
    const result = validateSpanPhysics(proposed, baseContext);
    expect(result.isValid).toBe(true);
  });

  it('should reject Span Rank 0 characters', () => {
    const proposed = {
      y: 946772400000,
      arrivalY: 946772400000 + 86400000,
      record: { eventIsSpan: true }
    };
    const result = validateSpanPhysics(proposed, { ...baseContext, spanRank: 0 });
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/Rank 0/);
  });

  it('should enforce Level Breath (no consecutive spans)', () => {
    const proposed = {
      y: 946772400000,
      arrivalY: 946772400000 + 86400000,
      record: { eventIsSpan: true }
    };
    const result = validateSpanPhysics(proposed, {
      ...baseContext,
      lastEvent: { record: { eventIsSpan: true } }
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/LEVEL BREATH/);
  });

  it('should skip Level Breath when skipLevelBreath option is set', () => {
    const proposed = {
      y: 946772400000,
      arrivalY: 946772400000 + 86400000,
      record: { eventIsSpan: true }
    };
    const result = validateSpanPhysics(proposed, {
      ...baseContext,
      lastEvent: { record: { eventIsSpan: true } }
    }, { skipLevelBreath: true });
    expect(result.isValid).toBe(true);
  });

  it('should warn when displacement exceeds Rank capacity', () => {
    const YEAR_MS = 31536000000;
    const proposed = {
      y: 946772400000,
      arrivalY: 946772400000 + YEAR_MS + 1,
      record: { eventIsSpan: true }
    };
    const result = validateSpanPhysics(proposed, { ...baseContext, spanRank: 1, currentPool: 0 });
    expect(result.isValid).toBe(true);
    expect(result.warning).toMatch(/Rank capacity/);
  });

  it('should pass for level events (no span validation)', () => {
    const proposed = {
      y: 946772400000,
      record: { eventIsSpan: false }
    };
    const result = validateSpanPhysics(proposed, baseContext);
    expect(result.isValid).toBe(true);
  });
});