import { describe, it, expect } from 'vitest';
import { getAgeBandCredit, CREDIT_PARAMS } from '../../modules/temporal-kernel/calculate-age-band-credit.js';

// BOUNDARY-TRACE: Every attribute curve must produce correct values at
// every semantic boundary (below rise, at rise, ramp, at peak,
// decay, at fall, beyond fall) and metabilities must always return 1.0.

describe('getAgeBandCredit: Force curve (rise=10, peak=25, fall=70, floor=0.15)', () => {
  const { rise, peak, fall, floor } = CREDIT_PARAMS.force;

  it('returns floor for ages below rise (0-9)', () => {
    expect(getAgeBandCredit('force', 0)).toBeCloseTo(floor, 4);
    expect(getAgeBandCredit('force', 5)).toBeCloseTo(floor, 4);
    expect(getAgeBandCredit('force', 9.99)).toBeCloseTo(floor, 4);
  });

  it('returns ramp value at rise (exactly rise)', () => {
    // At rise, ramp formula gives floor + (1-floor) * 0 = floor
    expect(getAgeBandCredit('force', rise)).toBeCloseTo(floor, 4);
  });

  it('ramps linearly from floor at rise to 1.0 at peak', () => {
    // At midpoint of ramp: age 17.5
    // credit = 0.15 + 0.85 * ((17.5 - 10) / 15) = 0.15 + 0.85 * 0.5 = 0.575
    expect(getAgeBandCredit('force', 17.5)).toBeCloseTo(0.575, 3);
  });

  it('returns 1.0 at peak age', () => {
    expect(getAgeBandCredit('force', peak)).toBe(1.0);
  });

  it('decays linearly from 1.0 at peak to floor at fall', () => {
    // At midpoint of decay: age 47.5
    // credit = 1.0 - 0.85 * ((47.5 - 25) / 45) = 1.0 - 0.85 * 0.5 = 0.575
    expect(getAgeBandCredit('force', 47.5)).toBeCloseTo(0.575, 3);
  });

  it('returns floor at fall age', () => {
    expect(getAgeBandCredit('force', fall)).toBeCloseTo(floor, 4);
  });

  it('returns floor for ages beyond fall (71+)', () => {
    expect(getAgeBandCredit('force', 71)).toBeCloseTo(floor, 4);
    expect(getAgeBandCredit('force', 100)).toBeCloseTo(floor, 4);
  });
});

describe('getAgeBandCredit: React curve (rise=8, peak=19, fall=65, floor=0.10)', () => {
  const { rise, peak, fall, floor } = CREDIT_PARAMS.react;

  it('returns floor for ages below rise', () => {
    expect(getAgeBandCredit('react', 0)).toBeCloseTo(floor, 4);
    expect(getAgeBandCredit('react', 7.5)).toBeCloseTo(floor, 4);
  });

  it('returns 1.0 at peak age (19)', () => {
    expect(getAgeBandCredit('react', 19)).toBe(1.0);
  });

  it('returns floor for ages beyond fall', () => {
    expect(getAgeBandCredit('react', 80)).toBeCloseTo(floor, 4);
  });
});

describe('getAgeBandCredit: Analyze curve (rise=6, peak=35, fall=80, floor=0.40)', () => {
  const { rise, peak, fall, floor } = CREDIT_PARAMS.analyze;

  it('returns floor for ages below rise', () => {
    expect(getAgeBandCredit('analyze', 0)).toBeCloseTo(floor, 4);
    expect(getAgeBandCredit('analyze', 5)).toBeCloseTo(floor, 4);
  });

  it('returns 1.0 at peak age (35)', () => {
    expect(getAgeBandCredit('analyze', 35)).toBe(1.0);
  });

  it('returns floor for ages beyond fall', () => {
    expect(getAgeBandCredit('analyze', 90)).toBeCloseTo(floor, 4);
  });
});

describe('getAgeBandCredit: Relate curve (rise=12, peak=45, fall=85, floor=0.50)', () => {
  const { rise, peak, fall, floor } = CREDIT_PARAMS.relate;

  it('returns floor for ages below rise', () => {
    expect(getAgeBandCredit('relate', 0)).toBeCloseTo(floor, 4);
    expect(getAgeBandCredit('relate', 10)).toBeCloseTo(floor, 4);
  });

  it('returns 1.0 at peak age (45)', () => {
    expect(getAgeBandCredit('relate', 45)).toBe(1.0);
  });

  it('returns floor for ages beyond fall', () => {
    expect(getAgeBandCredit('relate', 90)).toBeCloseTo(floor, 4);
  });

  it('gives higher credit than Force in middle age', () => {
    // At age 50: Force is in decay (past peak=25), Relate is past peak but still high
    expect(getAgeBandCredit('relate', 50)).toBeGreaterThan(getAgeBandCredit('force', 50));
  });
});

describe('getAgeBandCredit: Metabilities always return 1.0', () => {
  it('returns 1.0 for all metabilities at all ages', () => {
    const metaKeys = ['coercion', 'creativity', 'farsense', 'pk', 'redaction'];
    const testAges = [0, 5, 15, 25, 40, 60, 80, 100];

    for (const key of metaKeys) {
      for (const age of testAges) {
        expect(getAgeBandCredit(key, age)).toBe(1.0);
      }
    }
  });
});

describe('getAgeBandCredit: Unknown aspect key returns 1.0', () => {
  it('returns default 1.0 for unknown keys', () => {
    expect(getAgeBandCredit('unknown', 25)).toBe(1.0);
    expect(getAgeBandCredit('willpower', 30)).toBe(1.0);
  });
});

describe('getAgeBandCredit: Attribute-specific physical intuition', () => {
  it('Force peaks early: a 20-year-old gets more Force credit than a 50-year-old', () => {
    expect(getAgeBandCredit('force', 20)).toBeGreaterThan(getAgeBandCredit('force', 50));
  });

  it('React peaks earliest: a 19-year-old gets more React credit than Force credit', () => {
    expect(getAgeBandCredit('react', 19)).toBe(getAgeBandCredit('force', 19));
    // React at 19 is 1.0, Force at 19 is still ramping (rise=10, peak=25)
  });

  it('Relate peaks late: a 45-year-old gets more Relate credit than Force credit', () => {
    expect(getAgeBandCredit('relate', 45)).toBeGreaterThan(getAgeBandCredit('force', 45));
  });

  it('Analyze peaks mid-life: a 35-year-old gets more Analyze credit than React credit', () => {
    expect(getAgeBandCredit('analyze', 35)).toBeGreaterThan(getAgeBandCredit('react', 35));
  });
});