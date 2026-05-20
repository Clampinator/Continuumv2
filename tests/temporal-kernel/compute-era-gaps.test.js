import { describe, it, expect } from 'vitest';
import { computeEraGaps } from '../../modules/temporal-kernel/compute-era-gaps.js';
import { computeEraBoundaries } from '../../modules/temporal-kernel/compute-era-boundaries.js';

const YR = 31536000;

describe('computeEraGaps', () => {

  it('should return no gaps when last era extends to Infinity', () => {
    const erasData = {
      'era1': { name: 'Life', age: 0 }
    };
    const boundaries = computeEraBoundaries(erasData);
    const gaps = computeEraGaps(erasData, boundaries, 30 * YR, '2000-01-01');
    expect(gaps).toHaveLength(0);
  });

  it('should return a follow-on era when last era ends before NOW', () => {
    const erasData = {
      'era1': { name: 'Childhood', age: 0, dateFrom: '2000-01-01', dateTo: '2010-01-01' }
    };
    const boundaries = computeEraBoundaries(erasData);
    // NOW is at age 20yr, era ends at age ~10yr
    const gaps = computeEraGaps(erasData, boundaries, 20 * YR, '2000-01-01');
    expect(gaps).toHaveLength(1);
    expect(gaps[0].name).toBe('New Era');
    expect(gaps[0].age).toBeGreaterThan(9 * YR);
    expect(gaps[0].age).toBeLessThan(11 * YR);
  });

  it('should return no gap when last era covers NOW', () => {
    const erasData = {
      'era1': { name: 'Childhood', age: 0 }
    };
    const boundaries = computeEraBoundaries(erasData);
    // Last era has no dateTo, so endAge = Infinity
    const gaps = computeEraGaps(erasData, boundaries, 20 * YR, '2000-01-01');
    expect(gaps).toHaveLength(0);
  });

  it('should not create gap when next era starts immediately after previous', () => {
    const erasData = {
      'era1': { name: 'Childhood', age: 0, dateFrom: '2000-01-01', dateTo: '2010-01-01' },
      'era2': { name: 'Adulthood', age: 10 * YR }
    };
    const boundaries = computeEraBoundaries(erasData);
    // era1 ends at ~10yr, era2 starts at 10yr - no gap
    const gaps = computeEraGaps(erasData, boundaries, 20 * YR, '2000-01-01');
    expect(gaps).toHaveLength(0);
  });

  it('should detect gap between eras when events exist in the gap', () => {
    const erasData = {
      'era1': { name: 'Childhood', age: 0, dateFrom: '2000-01-01', dateTo: '2005-01-01', events: {
        'e1': { eventTitle: 'Early', eventAge: 3 * YR }
      }},
      'era2': { name: 'Adulthood', age: 15 * YR, events: {} }
    };
    const boundaries = computeEraBoundaries(erasData);
    // era1 ends at ~5yr, era2 starts at 15yr. Events in gap?
    // Our test event is at 3yr (inside era1), but if we add one at 8yr...
    const erasDataWithGap = {
      'era1': { name: 'Childhood', age: 0, dateFrom: '2000-01-01', dateTo: '2005-01-01', events: {
        'e1': { eventTitle: 'In gap', eventAge: 8 * YR }
      }},
      'era2': { name: 'Adulthood', age: 15 * YR, events: {} }
    };
    const boundariesWithGap = computeEraBoundaries(erasDataWithGap);
    const gaps = computeEraGaps(erasDataWithGap, boundariesWithGap, 20 * YR, '2000-01-01');
    expect(gaps.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle empty eras gracefully', () => {
    const gaps = computeEraGaps({}, [], 20 * YR, '2000-01-01');
    expect(gaps).toHaveLength(0);
  });

  // TTL BOUNDARY-TRACE TESTS
  // _deriveDateFrom now uses parseDateToObjectiveMs + formatDateOnly
  // instead of raw new Date(). These tests verify the TTL round-trip.

  it('should produce valid YYYY-MM-DD dateFrom via TTL (not ISO full-timestamp)', () => {
    // When a gap is detected, the follow-on era's dateFrom must be a clean
    // YYYY-MM-DD string, not an ISO timestamp like "2010-01-01T00:00:00.000Z"
    const erasData = {
      'era1': { name: 'Childhood', age: 0, dateFrom: '2000-01-01', dateTo: '2010-01-01' }
    };
    const boundaries = computeEraBoundaries(erasData);
    const gaps = computeEraGaps(erasData, boundaries, 20 * YR, '2000-01-01');
    expect(gaps).toHaveLength(1);
    // dateFrom must be YYYY-MM-DD format, no T or Z suffix
    expect(gaps[0].dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(gaps[0].dateFrom).not.toContain('T');
    expect(gaps[0].dateFrom).not.toContain('Z');
  });

  it('should derive dateFrom=2010-01-01 for a gap starting 10 years after DOB 2000-01-01', () => {
    const erasData = {
      'era1': { name: 'Childhood', age: 0, dateFrom: '2000-01-01', dateTo: '2010-01-01' }
    };
    const boundaries = computeEraBoundaries(erasData);
    const gaps = computeEraGaps(erasData, boundaries, 20 * YR, '2000-01-01');
    expect(gaps).toHaveLength(1);
    expect(gaps[0].dateFrom).toBe('2010-01-01');
  });

  it('should return empty dateFrom when dobStr is empty', () => {
    const erasData = {
      'era1': { name: 'Childhood', age: 0, dateFrom: '2000-01-01', dateTo: '2010-01-01' }
    };
    const boundaries = computeEraBoundaries(erasData);
    const gaps = computeEraGaps(erasData, boundaries, 20 * YR, '');
    expect(gaps).toHaveLength(1);
    expect(gaps[0].dateFrom).toBe('');
  });

  it('should use TTL-consistent date formatting for gap dateFrom (no timezone drift)', () => {
    // DOB in a timezone-sensitive date. TTL uses UTC to avoid local timezone shifts.
    const erasData = {
      'era1': { name: 'Early', age: 0, dateFrom: '1999-12-31', dateTo: '2009-12-31' }
    };
    const boundaries = computeEraBoundaries(erasData);
    const gaps = computeEraGaps(erasData, boundaries, 20 * YR, '1999-12-31');
    expect(gaps).toHaveLength(1);
    // Must produce a clean date, not shifted by timezone
    expect(gaps[0].dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // The exact date should be 10 years after 1999-12-31 = 2009-12-31
    expect(gaps[0].dateFrom).toBe('2009-12-31');
  });
});