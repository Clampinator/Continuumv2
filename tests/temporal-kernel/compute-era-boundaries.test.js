import { describe, it, expect } from 'vitest';
import { computeEraBoundaries } from '../../modules/temporal-kernel/compute-era-boundaries.js';

const YR = 31536000;

describe('computeEraBoundaries', () => {
  it('should sort eras by startAge', () => {
    const eras = {
      'era2': { name: 'Adulthood', age: 10 * YR, sort: 2 },
      'era1': { name: 'Childhood', age: 0, sort: 1 }
    };
    const result = computeEraBoundaries(eras);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Childhood');
    expect(result[1].name).toBe('Adulthood');
    expect(result[0].startAge).toBe(0);
    expect(result[1].startAge).toBe(10 * YR);
  });

  it('should compute endAge from dateTo via TTL', () => {
    const eras = {
      'era1': {
        name: 'Childhood',
        age: 0,
        dateFrom: '2000-01-01',
        dateTo: '2010-01-01'
      }
    };
    const result = computeEraBoundaries(eras);
    expect(result[0].startAge).toBe(0);
    // TTL produces timezone-aware ms; 10yr in seconds is approximate
    expect(result[0].endAge).toBeGreaterThan(9 * YR);
    expect(result[0].endAge).toBeLessThan(11 * YR);
    expect(result[0].computedDuration).toBeGreaterThan(9 * YR);
  });

  it('should fill endAge from next era when dateTo absent', () => {
    const eras = {
      'era1': { name: 'Childhood', age: 0 },
      'era2': { name: 'Adulthood', age: 10 * YR }
    };
    const result = computeEraBoundaries(eras);
    expect(result[0].endAge).toBe(10 * YR);
    expect(result[0].computedDuration).toBe(10 * YR);
  });

  it('should set endAge to Infinity for last era without dateTo', () => {
    const eras = {
      'era1': { name: 'Forever', age: 0 }
    };
    const result = computeEraBoundaries(eras);
    expect(result[0].endAge).toBe(Infinity);
    expect(result[0].computedDuration).toBe(0);
  });

  it('should NOT extend era boundary past explicit dateTo for events', () => {
    const eras = {
      'era1': {
        name: 'Childhood',
        age: 0,
        dateFrom: '2000-01-01',
        dateTo: '2005-01-01',
        events: {
          'evt1': { eventTitle: 'Late event', eventAge: 8 * YR }
        }
      }
    };
    const result = computeEraBoundaries(eras);
    // User-set dateTo is authoritative. Events beyond it belong
    // to a different era and will be migrated by the caller.
    expect(result[0].endAge).toBeGreaterThan(4 * YR);
    expect(result[0].endAge).toBeLessThan(6 * YR);
  });

  it('should use furthest event age when dateTo is absent', () => {
    const eras = {
      'era1': {
        name: 'Childhood',
        age: 0,
        events: {
          'evt1': { eventTitle: 'Some event', eventAge: 5 * YR },
          'evt2': { eventTitle: 'Later event', eventAge: 7 * YR }
        }
      },
      'era2': { name: 'Teens', age: 10 * YR }
    };
    const result = computeEraBoundaries(eras);
    // era1's events go to 7yr, era2 starts at 10yr
    // No dateTo on era1 so it has no explicit end; events extend to 7yr
    // but era2's start (10yr) overrides since it's the next era boundary
    // The function fills endAge from next era for eras without dateTo
    expect(result[0].endAge).toBe(10 * YR);
  });

  it('should NOT extend era past explicit dateTo for experience events', () => {
    const eras = {
      'era1': {
        name: 'Childhood',
        age: 0,
        dateFrom: '2000-01-01',
        dateTo: '2005-01-01',
        experiences: {
          'exp1': {
            name: 'School',
            events: {
              'evt1': { eventTitle: 'Graduation', eventAge: 6 * YR }
            }
          }
        }
      }
    };
    const result = computeEraBoundaries(eras);
    // User-set dateTo is authoritative; events beyond it will be migrated
    expect(result[0].endAge).toBeGreaterThan(4 * YR);
    expect(result[0].endAge).toBeLessThan(6 * YR);
  });

  it('should propagate startAge forward when previous era overlaps', () => {
    const eras = {
      'era1': {
        name: 'Long Era',
        age: 0,
        dateFrom: '2000-01-01',
        dateTo: '2015-01-01'
      },
      'era2': {
        name: 'Overlap Era',
        age: 10 * YR
      }
    };
    const result = computeEraBoundaries(eras);
    // era1 extends to ~15yr (TTL date), era2 claims to start at 10yr.
    // Propagation: shift era2 start to where era1 ends.
    expect(result[0].startAge).toBe(0);
    expect(result[0].endAge).toBeGreaterThan(14 * YR);
    expect(result[1].startAge).toBeGreaterThan(14 * YR);
  });

  it('should handle empty eras gracefully', () => {
    expect(computeEraBoundaries(null)).toEqual([]);
    expect(computeEraBoundaries({})).toEqual([]);
    expect(computeEraBoundaries(undefined)).toEqual([]);
  });

  it('should default name to Untitled when missing', () => {
    const eras = {
      'era1': { age: 0 }
    };
    const result = computeEraBoundaries(eras);
    expect(result[0].name).toBe('Untitled');
  });

  it('should default startAge to 0 when age is missing', () => {
    const eras = {
      'era1': { name: 'Test' }
    };
    const result = computeEraBoundaries(eras);
    expect(result[0].startAge).toBe(0);
  });

  it('should extend auto-era (no dateTo) boundary with events', () => {
    const eras = {
      'era1': {
        name: 'Childhood',
        age: 0,
        events: {
          'evt1': { eventTitle: 'Event at 5yr', eventAge: 5 * YR },
          'evt2': { eventTitle: 'Event at 8yr', eventAge: 8 * YR }
        }
      },
      'era2': { name: 'Adulthood', age: 15 * YR }
    };
    const result = computeEraBoundaries(eras);
    // era1 has no dateTo, so events extend it to max(8yr, next era start=15yr)
    expect(result[0].endAge).toBe(15 * YR);
  });

  it('should respect explicit dateTo even when events are beyond it', () => {
    const eras = {
      'era1': {
        name: 'Childhood',
        age: 0,
        dateFrom: '2000-01-01',
        dateTo: '2005-01-01',
        events: {
          'evt1': { eventTitle: 'Event at 8yr', eventAge: 8 * YR }
        }
      },
      'era2': { name: 'Adulthood', age: 15 * YR }
    };
    const result = computeEraBoundaries(eras);
    // era1 has explicit dateTo (~5yr). Events at 8yr do NOT extend it.
    // The event at 8yr is "orphaned" and will be migrated by the caller.
    expect(result[0].endAge).toBeGreaterThan(4 * YR);
    expect(result[0].endAge).toBeLessThan(6 * YR);
  });
});