import { describe, it, expect } from 'vitest';
import { MS_PER_SECOND, SECONDS_IN_YEAR, TARGET_RATIO } from '../../modules/temporal-engine/constants.js';

describe('Temporal Constants', () => {
  it('should define MS_PER_SECOND as 1000', () => {
    expect(MS_PER_SECOND).toBe(1000);
  });

  it('should define SECONDS_IN_YEAR accurately', () => {
    // 365 days * 24 hours * 60 minutes * 60 seconds
    expect(SECONDS_IN_YEAR).toBe(31536000);
  });

  it('should define TARGET_RATIO for 30-degree visual sweep', () => {
    // tan(30) ≈ 0.57735. The system uses this ratio for the visual sweep.
    expect(TARGET_RATIO).toBeCloseTo(-0.00057735, 5);
    });
    });
