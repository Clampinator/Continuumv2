import { describe, it, expect } from 'vitest';
import { calculateLevelUp } from '../../modules/temporal-kernel/calculate-level-up.js';

// BOUNDARY-TRACE: Every semantic path for level-up eligibility must be correct.
// This includes: no level-up, single level-up, multi-level jump,
// metability potential cap, zero-level metabilities, and null guards.

describe('calculateLevelUp: Basic eligibility', () => {
  const baseProgression = {
    force: { currentLevel: 4, totalLinkedYears: 5, progressYears: 5, nextLevelCost: 4, canLevelUp: true },
    analyze: { currentLevel: 4, totalLinkedYears: 2, progressYears: 2, nextLevelCost: 4, canLevelUp: false },
    relate: { currentLevel: 4, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 4, canLevelUp: false },
    react: { currentLevel: 4, totalLinkedYears: 10, progressYears: 10, nextLevelCost: 4, canLevelUp: true },
    coercion: { currentLevel: 1, totalLinkedYears: 1, progressYears: 1, nextLevelCost: 1, canLevelUp: true },
    creativity: { currentLevel: 0, totalLinkedYears: 3, progressYears: 3, nextLevelCost: 0, canLevelUp: false },
    farsense: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
    pk: { currentLevel: 2, totalLinkedYears: 3, progressYears: 3, nextLevelCost: 2, canLevelUp: true },
    redaction: { currentLevel: 3, totalLinkedYears: 6, progressYears: 6, nextLevelCost: 3, canLevelUp: true }
  };

  it('returns eligible level-ups for aspects with enough accumulated years', () => {
    const potentials = { coercion: 3, creativity: 2, farsense: 1, pk: 3, redaction: 5 };
    const result = calculateLevelUp(baseProgression, potentials);

    // Force has 5 linked years, level 4. Cumulative for 5 = 10, has 5. Not enough.
    // Wait - totalLinkedYears=5, cost for level 5 = T(5) = 10. 5 < 10. No level-up.
    // React has 10 linked years, level 4. T(5) = 10. 10 >= 10. YES level-up.
    // Coercion has 1 linked year, level 1. T(2) = 1. 1 >= 1. YES level-up.
    // PK has 3 linked years, level 2. T(3) = 3. 3 >= 3. YES level-up to 3.
    // Redaction has 6 linked years, level 3. T(4) = 6. 6 >= 6. YES level-up to 4.

    const aspects = result.map(r => r.aspect);
    expect(aspects).toContain('react');
    expect(aspects).toContain('coercion');
    expect(aspects).toContain('pk');
    expect(aspects).toContain('redaction');
    // Force with 5 years at level 4 needs 10 cumulative. Not enough.
    expect(aspects).not.toContain('force');
    // Analyze with 2 years at level 4 needs 10. Not enough.
    expect(aspects).not.toContain('analyze');
  });

  it('correctly computes new levels for single level-ups', () => {
    const potentials = { coercion: 3, creativity: 2, farsense: 1, pk: 3, redaction: 5 };
    const result = calculateLevelUp(baseProgression, potentials);

    const coercion = result.find(r => r.aspect === 'coercion');
    expect(coercion.currentLevel).toBe(1);
    expect(coercion.newLevel).toBe(2);

    const pk = result.find(r => r.aspect === 'pk');
    expect(pk.currentLevel).toBe(2);
    expect(pk.newLevel).toBe(3);

    const redaction = result.find(r => r.aspect === 'redaction');
    expect(redaction.currentLevel).toBe(3);
    expect(redaction.newLevel).toBe(4);
  });

  it('handles multi-level jumps when enough years are accumulated', () => {
    // React at level 4 with 10 linked years.
    // T(5) = 10. Can reach level 5. Check T(6) = 15. 10 < 15. Stop.
    // So react goes from 4 -> 5 only.
    // But let's test a bigger jump: Force at level 1 with 6 linked years.
    // T(2) = 1, T(3) = 3, T(4) = 6. Can reach level 4.
    const progression = {
      force: { currentLevel: 1, totalLinkedYears: 6, progressYears: 6, nextLevelCost: 1, canLevelUp: true },
      analyze: { currentLevel: 1, totalLinkedYears: 2, progressYears: 2, nextLevelCost: 1, canLevelUp: true },
      relate: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      react: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      coercion: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      creativity: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      farsense: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      pk: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      redaction: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false }
    };
    const potentials = {};
    const result = calculateLevelUp(progression, potentials);

    const force = result.find(r => r.aspect === 'force');
    expect(force).toBeDefined();
    expect(force.currentLevel).toBe(1);
    expect(force.newLevel).toBe(4);
    // Analyze: 2 years at level 1. T(2)=1, T(3)=3. 2<3. Only level 2.
    const analyze = result.find(r => r.aspect === 'analyze');
    expect(analyze.newLevel).toBe(2);
  });
});

describe('calculateLevelUp: Metability potential cap', () => {
  it('caps metability level-up at operant potential', () => {
    // Coercion at level 2 with 3 years. T(3)=3, T(4)=6. Can reach 3.
    // But potential is 3, so can reach 3. That's fine.
    const progression = {
      force: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      analyze: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      relate: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      react: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      coercion: { currentLevel: 2, totalLinkedYears: 3, progressYears: 3, nextLevelCost: 2, canLevelUp: true },
      creativity: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      farsense: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      pk: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      redaction: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false }
    };
    const potentials = { coercion: 3, creativity: 2, farsense: 0, pk: 0, redaction: 0 };
    const result = calculateLevelUp(progression, potentials);

    const coercion = result.find(r => r.aspect === 'coercion');
    expect(coercion.newLevel).toBe(3);
  });

  it('prevents metability from exceeding potential', () => {
    // Coercion at level 2 with 6 years. T(3)=3, T(4)=6, T(5)=10.
    // Would reach level 4 (6>=6), but potential is 3.
    const progression = {
      force: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      analyze: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      relate: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      react: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      coercion: { currentLevel: 2, totalLinkedYears: 6, progressYears: 6, nextLevelCost: 2, canLevelUp: true },
      creativity: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      farsense: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      pk: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      redaction: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false }
    };
    const potentials = { coercion: 3 };
    const result = calculateLevelUp(progression, potentials);

    const coercion = result.find(r => r.aspect === 'coercion');
    expect(coercion.newLevel).toBe(3);
    // Does NOT go to 4 because potential is 3
  });

  it('does not cap attributes (no potential)', () => {
    // Force at level 4 with 15 years. T(5)=10, T(6)=15.
    // Attributes have no potential cap, so can reach level 6.
    const progression = {
      force: { currentLevel: 4, totalLinkedYears: 15, progressYears: 15, nextLevelCost: 4, canLevelUp: true },
      analyze: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      relate: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      react: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      coercion: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      creativity: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      farsense: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      pk: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      redaction: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false }
    };
    const result = calculateLevelUp(progression, {});

    const force = result.find(r => r.aspect === 'force');
    expect(force).toBeDefined();
    expect(force.newLevel).toBe(6);
  });
});

describe('calculateLevelUp: Null guards and edge cases', () => {
  it('returns empty array for null progression', () => {
    expect(calculateLevelUp(null)).toEqual([]);
  });

  it('returns empty array for empty progression', () => {
    expect(calculateLevelUp({})).toEqual([]);
  });

  it('skips level 0 metabilities (not yet operant)', () => {
    const progression = {
      force: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      analyze: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      relate: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      react: { currentLevel: 1, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 1, canLevelUp: false },
      coercion: { currentLevel: 0, totalLinkedYears: 5, progressYears: 5, nextLevelCost: 0, canLevelUp: false },
      creativity: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      farsense: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      pk: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false },
      redaction: { currentLevel: 0, totalLinkedYears: 0, progressYears: 0, nextLevelCost: 0, canLevelUp: false }
    };
    const result = calculateLevelUp(progression, {});
    // Coercion at level 0 with 5 years should NOT appear because
    // level 0 is not operant (currentLevel < 1 check).
    const coercion = result.find(r => r.aspect === 'coercion');
    expect(coercion).toBeUndefined();
  });
});