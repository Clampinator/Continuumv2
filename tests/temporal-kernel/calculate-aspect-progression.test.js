import { describe, it, expect } from 'vitest';
import { calculateAspectProgression, _cumulativeCost } from '../../modules/temporal-kernel/calculate-aspect-progression.js';
import { getAgeBandCredit, CREDIT_PARAMS } from '../../modules/temporal-kernel/calculate-age-band-credit.js';

const YR = 31536000;

// BOUNDARY-TRACE: Every semantic path through the progression calculation
// must produce correct output.

describe('_cumulativeCost: Triangular number progression', () => {
  it('returns 0 for level 1 (born at level 1, no cost)', () => {
    expect(_cumulativeCost(1)).toBe(0);
  });

  it('returns 0 for level 0 or negative levels', () => {
    expect(_cumulativeCost(0)).toBe(0);
    expect(_cumulativeCost(-1)).toBe(0);
  });

  it('returns 1 for level 2 (need 1 year for 1->2)', () => {
    expect(_cumulativeCost(2)).toBe(1);
  });

  it('returns 3 for level 3 (1+2 years cumulative)', () => {
    expect(_cumulativeCost(3)).toBe(3);
  });

  it('returns 6 for level 4 (1+2+3 years cumulative)', () => {
    expect(_cumulativeCost(4)).toBe(6);
  });

  it('returns 10 for level 5 (1+2+3+4 years cumulative)', () => {
    expect(_cumulativeCost(5)).toBe(10);
  });

  it('returns 15 for level 6 (1+2+3+4+5 years cumulative)', () => {
    expect(_cumulativeCost(6)).toBe(15);
  });
});

describe('getAgeBandCredit: Attribute age-band curves', () => {
  it('returns floor for ages below rise', () => {
    expect(getAgeBandCredit('force', 0)).toBeCloseTo(0.15, 2);
    expect(getAgeBandCredit('force', 5)).toBeCloseTo(0.15, 2);
    expect(getAgeBandCredit('react', 3)).toBeCloseTo(0.10, 2);
    expect(getAgeBandCredit('analyze', 2)).toBeCloseTo(0.40, 2);
  });

  it('returns 1.0 at peak age', () => {
    expect(getAgeBandCredit('force', 25)).toBe(1.0);
    expect(getAgeBandCredit('analyze', 35)).toBe(1.0);
    expect(getAgeBandCredit('relate', 45)).toBe(1.0);
    expect(getAgeBandCredit('react', 19)).toBe(1.0);
  });

  it('ramps linearly from floor at rise to 1.0 at peak', () => {
    // Force: rise=10, peak=25, floor=0.15
    // At rise (10): floor + 0 = 0.15
    expect(getAgeBandCredit('force', 10)).toBeCloseTo(0.15, 2);
    // Halfway between rise and peak (17.5): 0.15 + 0.85 * (7.5/15) = 0.575
    expect(getAgeBandCredit('force', 17.5)).toBeCloseTo(0.575, 2);
  });

  it('decays linearly from 1.0 at peak to floor at fall', () => {
    // Force: peak=25, fall=70, floor=0.15
    // At fall (70): floor
    expect(getAgeBandCredit('force', 70)).toBeCloseTo(0.15, 2);
    // Halfway between peak and fall (47.5): 1.0 - 0.85 * (22.5/45) = 0.575
    expect(getAgeBandCredit('force', 47.5)).toBeCloseTo(0.575, 2);
  });

  it('returns floor for ages beyond fall', () => {
    expect(getAgeBandCredit('force', 80)).toBeCloseTo(0.15, 2);
    expect(getAgeBandCredit('react', 90)).toBeCloseTo(0.10, 2);
  });

  it('returns 1.0 for all metabilities at any age', () => {
    const metaKeys = ['coercion', 'creativity', 'farsense', 'pk', 'redaction'];
    for (const key of metaKeys) {
      expect(getAgeBandCredit(key, 0)).toBe(1.0);
      expect(getAgeBandCredit(key, 25)).toBe(1.0);
      expect(getAgeBandCredit(key, 100)).toBe(1.0);
    }
  });

  it('returns 1.0 for unknown aspect keys', () => {
    expect(getAgeBandCredit('unknown', 25)).toBe(1.0);
  });
});

describe('calculateAspectProgression: Age-band credit integration', () => {
  const freshLevels = {
    force: 4, analyze: 4, relate: 4, react: 4,
    coercion: 0, creativity: 0, farsense: 0, pk: 0, redaction: 0
  };

  const startEra = {
    id: 'era1',
    name: 'Childhood',
    dateFrom: '2000-01-01',
    dateTo: '',
    experiences: {},
    events: {}
  };

  it('applies age-band credit to Force experience at peak age (25)', () => {
    // 5-year Force experience from age 22.5 to 27.5 (midpoint = 25)
    // At age 25, Force credit = 1.0 (peak)
    // Expected: 5 * 1.0 = 5.0 credited years
    const eras = {
      era1: {
        ...startEra,
        experiences: {
          exp1: {
            id: 'exp1',
            name: 'Peak Force Training',
            linkedAspects: ['force'],
            startAgeSeconds: 22.5 * YR,
            endAgeSeconds: 27.5 * YR,
            dateFrom: '2022-06-01',
            dateTo: '2027-06-01'
          }
        }
      }
    };

    const result = calculateAspectProgression(eras, 30 * YR, freshLevels);
    expect(result.force.totalLinkedYears).toBeCloseTo(5.0, 1);
  });

  it('applies age-band floor to Force experience in early childhood', () => {
    // 2-year Force experience from age 3-5 (midpoint = 4)
    // At age 4, Force credit = floor (0.15) since 4 < rise (10)
    // Expected: 2 * 0.15 = 0.3 credited years
    const eras = {
      era1: {
        ...startEra,
        experiences: {
          exp1: {
            id: 'exp1',
            name: 'Toddler Play',
            linkedAspects: ['force'],
            startAgeSeconds: 3 * YR,
            endAgeSeconds: 5 * YR,
            dateFrom: '2003-01-01',
            dateTo: '2005-01-01'
          }
        }
      }
    };

    const result = calculateAspectProgression(eras, 10 * YR, freshLevels);
    expect(result.force.totalLinkedYears).toBeCloseTo(0.3, 1);
  });

  it('applies decay credit to Force experience in old age', () => {
    // 3-year Force experience from age 60-63 (midpoint = 61.5)
    // Force at 61.5: peak=25, fall=70, floor=0.15
    // credit = max(0.15, 1.0 - 0.85 * (61.5-25)/45) = max(0.15, 1.0 - 0.688) = 0.312
    // Expected: 3 * 0.312 = 0.937 credited years
    const eras = {
      era1: {
        ...startEra,
        experiences: {
          exp1: {
            id: 'exp1',
            name: 'Older Training',
            linkedAspects: ['force'],
            startAgeSeconds: 60 * YR,
            endAgeSeconds: 63 * YR,
            dateFrom: '2060-01-01',
            dateTo: '2063-01-01'
          }
        }
      }
    };

    const result = calculateAspectProgression(eras, 65 * YR, freshLevels);
    const expectedCredit = 3 * Math.max(0.15, 1.0 - 0.85 * (61.5 - 25) / 45);
    expect(result.force.totalLinkedYears).toBeCloseTo(expectedCredit, 1);
  });

  it('gives full credit to metabilities regardless of age', () => {
    // 2-year Coercion experience at age 3 (well before any physical peak)
    // Metabilities always get 1.0 credit
    const eras = {
      era1: {
        ...startEra,
        experiences: {
          exp1: {
            id: 'exp1',
            name: 'Early Coercion',
            linkedAspects: ['coercion'],
            startAgeSeconds: 3 * YR,
            endAgeSeconds: 5 * YR,
            dateFrom: '2003-01-01',
            dateTo: '2005-01-01'
          }
        }
      }
    };

    const result = calculateAspectProgression(eras, 10 * YR, freshLevels);
    expect(result.coercion.totalLinkedYears).toBe(2);
  });

  it('correctly applies ramp credit for Force at age 17.5 (midpoint)', () => {
    // 6-year Force experience from age 10-16 (midpoint = 13)
    // Force at 13: rise=10, peak=25, floor=0.15
    // credit = 0.15 + 0.85 * (13-10)/(25-10) = 0.15 + 0.85 * 0.2 = 0.32
    // Expected: 6 * 0.32 = 1.92 credited years
    const eras = {
      era1: {
        ...startEra,
        experiences: {
          exp1: {
            id: 'exp1',
            name: 'Teen Training',
            linkedAspects: ['force'],
            startAgeSeconds: 10 * YR,
            endAgeSeconds: 16 * YR,
            dateFrom: '2010-01-01',
            dateTo: '2016-01-01'
          }
        }
      }
    };

    const result = calculateAspectProgression(eras, 20 * YR, freshLevels);
    const midAge = 13;
    const credit = 0.15 + 0.85 * ((midAge - 10) / (25 - 10));
    expect(result.force.totalLinkedYears).toBeCloseTo(6 * credit, 1);
  });

  it('multi-applies different age-band credit for each linked aspect', () => {
    // 5-year experience linked to both Force and Relate, midpoint age 25
    // Force at 25: 1.0 (peak)
    // Relate at 25: rise=12, peak=45, floor=0.5
    //   credit = 0.5 + 0.5 * ((25-12)/(45-12)) = 0.5 + 0.5 * 0.394 = 0.697
    const eras = {
      era1: {
        ...startEra,
        experiences: {
          exp1: {
            id: 'exp1',
            name: 'Social Training',
            linkedAspects: ['force', 'relate'],
            startAgeSeconds: 22.5 * YR,
            endAgeSeconds: 27.5 * YR,
            dateFrom: '2022-06-01',
            dateTo: '2027-06-01'
          }
        }
      }
    };

    const result = calculateAspectProgression(eras, 30 * YR, freshLevels);
    expect(result.force.totalLinkedYears).toBeCloseTo(5.0, 1);
    const relateCredit = 0.5 + 0.5 * ((25 - 12) / (45 - 12));
    expect(result.relate.totalLinkedYears).toBeCloseTo(5 * relateCredit, 1);
  });
});

describe('calculateAspectProgression: Basic progression', () => {
  const freshLevels = {
    force: 4, analyze: 4, relate: 4, react: 4,
    coercion: 0, creativity: 0, farsense: 0, pk: 0, redaction: 0
  };

  const startEra = {
    id: 'era1',
    name: 'Childhood',
    dateFrom: '2000-01-01',
    dateTo: '',
    experiences: {},
    events: {}
  };

  it('returns progression for all 9 aspects even with no linked experiences', () => {
    const result = calculateAspectProgression({ era1: startEra }, 10 * YR, freshLevels);
    const aspectKeys = ['force', 'analyze', 'relate', 'react', 'coercion', 'creativity', 'farsense', 'pk', 'redaction'];
    for (const key of aspectKeys) {
      expect(result[key]).toBeDefined();
      expect(result[key].totalLinkedYears).toBe(0);
      expect(result[key].canLevelUp).toBe(false);
    }
  });

  it('returns empty progressions when eras is null', () => {
    const result = calculateAspectProgression(null, 10 * YR, freshLevels);
    expect(result.force.totalLinkedYears).toBe(0);
    expect(result.force.canLevelUp).toBe(false);
  });

  it('returns empty progressions when levelingAge is null', () => {
    const result = calculateAspectProgression({ era1: startEra }, null, freshLevels);
    expect(result.force.totalLinkedYears).toBe(0);
  });

  it('computes linked years with age-band credit from a single closed experience', () => {
    // Character at subjective age 10, with a 2-year Force experience from age 8-10
    // Midpoint age = 9, Force credit at 9 = floor (0.15) since 9 < rise (10)
    // Expected: 2 * 0.15 = 0.3 credited years
    const eras = {
      era1: {
        ...startEra,
        experiences: {
          exp1: {
            id: 'exp1',
            name: 'Military Training',
            linkedAspects: ['force'],
            startAgeSeconds: 8 * YR,
            endAgeSeconds: 10 * YR,
            dateFrom: '2008-01-01',
            dateTo: '2010-01-01'
          }
        }
      }
    };

    const result = calculateAspectProgression(eras, 10 * YR, freshLevels);
    expect(result.force.totalLinkedYears).toBeCloseTo(2 * 0.15, 2);
    expect(result.analyze.totalLinkedYears).toBe(0);
  });

  it('gives full credit to each aspect for multi-linked experience at peak age', () => {
    // 3-year experience linked to Force and React, midpoint = 6.5
    // Force at 6.5: floor (0.15), React at 6.5: floor (0.10)
    // Force: 3 * 0.15 = 0.45, React: 3 * 0.10 = 0.30
    const eras = {
      era1: {
        ...startEra,
        experiences: {
          exp1: {
            id: 'exp1',
            name: 'Combat School',
            linkedAspects: ['force', 'react'],
            startAgeSeconds: 5 * YR,
            endAgeSeconds: 8 * YR,
            dateFrom: '2005-01-01',
            dateTo: '2008-01-01'
          }
        }
      }
    };

    const result = calculateAspectProgression(eras, 10 * YR, freshLevels);
    expect(result.force.totalLinkedYears).toBeCloseTo(3 * 0.15, 2);
    expect(result.react.totalLinkedYears).toBeCloseTo(3 * 0.10, 2);
  });

  it('computes ongoing experience duration with age-band credit', () => {
    // Ongoing Analyze experience started at age 5, character now at age 10
    // Midpoint age = 7.5, Analyze at 7.5: rise=6, peak=35, floor=0.4
    // credit = 0.4 + 0.6 * ((7.5-6)/(35-6)) = 0.4 + 0.6 * 0.0517 = 0.431
    const eras = {
      era1: {
        ...startEra,
        experiences: {
          exp1: {
            id: 'exp1',
            name: 'Apprenticeship',
            linkedAspects: ['analyze'],
            startAgeSeconds: 5 * YR,
            endAgeSeconds: 10 * YR,
            isOngoing: true,
            dateFrom: '2005-01-01',
            dateTo: ''
          }
        }
      }
    };

    const result = calculateAspectProgression(eras, 10 * YR, freshLevels);
    const midpointAge = 7.5;
    const expectedCredit = 0.4 + 0.6 * ((midpointAge - 6) / (35 - 6));
    expect(result.analyze.totalLinkedYears).toBeCloseTo(5 * expectedCredit, 1);
  });

  it('correctly computes canLevelUp when accumulated years meet threshold at peak age', () => {
    // Force at level 4. Needs 4 years to reach level 5 (cumulative = 10).
    // Give 5 linked years at peak Force age (midpoint = 25, credit = 1.0)
    const eras = {
      era1: {
        ...startEra,
        experiences: {
          exp1: {
            id: 'exp1',
            name: 'Intensive Force Training',
            linkedAspects: ['force'],
            startAgeSeconds: 22.5 * YR,
            endAgeSeconds: 27.5 * YR,
            dateFrom: '2022-06-01',
            dateTo: '2027-06-01'
          }
        }
      }
    };

    const levels = { ...freshLevels, force: 4 };
    const result = calculateAspectProgression(eras, 30 * YR, levels);
    expect(result.force.currentLevel).toBe(4);
    expect(result.force.totalLinkedYears).toBeCloseTo(5.0, 1);
    expect(result.force.nextLevelCost).toBe(4);
    expect(result.force.canLevelUp).toBe(true);
  });
});

describe('calculateAspectProgression: Forgetting toggle with age-band', () => {
  const freshLevels = {
    force: 4, analyze: 4, relate: 4, react: 4,
    coercion: 0, creativity: 0, farsense: 0, pk: 0, redaction: 0
  };

  const startEra = {
    id: 'era1',
    name: 'Test',
    dateFrom: '2000-01-01',
    dateTo: '',
    experiences: {},
    events: {}
  };

  it('reduces progression credit for old experience when forgetting is enabled', () => {
    // 5-year Force experience from age 0-5, ended 15 years ago (now=20).
    // Midpoint age = 2.5, Force at 2.5: floor (0.15)
    // Without Forgetting: 5 * 0.15 = 0.75 credited years
    // With Forgetting: 15yr distance, duration=5 (>4yr bonus=3), distance=15yr (bonus=0)
    // bonus = min(3,0) = 0, multiplier = 0. Total = 0.
    const eras = {
      era1: {
        ...startEra,
        experiences: {
          exp1: {
            id: 'exp1',
            name: 'Ancient Training',
            linkedAspects: ['force'],
            startAgeSeconds: 0,
            endAgeSeconds: 5 * YR,
            dateFrom: '2000-01-01',
            dateTo: '2005-01-01'
          }
        }
      }
    };

    const nowAge = 20 * YR;
    const resultFull = calculateAspectProgression(eras, nowAge, freshLevels, false);
    const resultForgetting = calculateAspectProgression(eras, nowAge, freshLevels, true);

    // Without Forgetting: 5 * 0.15 = 0.75 (age-band floor)
    expect(resultFull.force.totalLinkedYears).toBeCloseTo(0.75, 1);
    // With Forgetting: 0 (distance too large, multiplier=0)
    expect(resultForgetting.force.totalLinkedYears).toBeCloseTo(0, 1);
  });

  it('preserves full credit for recent experience at peak age when forgetting is enabled', () => {
    // 5-year ongoing Force experience at peak age (22.5-27.5), midpoint=25
    // Force at 25: credit = 1.0, ongoing = distance 0, forgetting bonus = 3
    // Total: 5 * 1.0 * 1.0 = 5.0
    const eras = {
      era1: {
        ...startEra,
        experiences: {
          exp1: {
            id: 'exp1',
            name: 'Current Training',
            linkedAspects: ['force'],
            startAgeSeconds: 22.5 * YR,
            endAgeSeconds: 27.5 * YR,
            isOngoing: true,
            dateFrom: '2022-06-01',
            dateTo: ''
          }
        }
      }
    };

    const result = calculateAspectProgression(eras, 27.5 * YR, freshLevels, true);
    expect(result.force.totalLinkedYears).toBeCloseTo(5.0, 1);
  });
});