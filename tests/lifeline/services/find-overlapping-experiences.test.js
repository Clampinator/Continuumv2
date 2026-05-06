import { describe, it, expect } from 'vitest';
import { findOverlappingExperiences } from '../../../modules/lifeline/services/context-finder-logic/find-overlapping-experiences.js';

describe('findOverlappingExperiences (TTL timezone-safe)', () => {
  const makeActor = (experiences) => ({
    system: {
      eras: {
        era1: {
          id: 'era1',
          name: 'Main Era',
          experiences
        }
      }
    }
  });

  it('finds overlapping open experience', () => {
    const actor = makeActor({
      exp1: { id: 'exp1', name: 'College', dateFrom: '2005-09-01', dateTo: '' }
    });
    // Target in 2010 (after start)
    const targetTime = Date.UTC(2010, 5, 1);
    const result = findOverlappingExperiences(actor, targetTime);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('College');
    expect(result[0].isOpen).toBe(true);
  });

  it('finds overlapping closed experience', () => {
    const actor = makeActor({
      exp1: { id: 'exp1', name: 'College', dateFrom: '2005-09-01', dateTo: '2009-06-15' }
    });
    const targetTime = Date.UTC(2007, 0, 1);
    const result = findOverlappingExperiences(actor, targetTime);
    expect(result).toHaveLength(1);
    expect(result[0].isOpen).toBe(false);
  });

  it('excludes experience that starts after target', () => {
    const actor = makeActor({
      exp1: { id: 'exp1', name: 'Future', dateFrom: '2030-01-01', dateTo: '' }
    });
    const targetTime = Date.UTC(2020, 0, 1);
    const result = findOverlappingExperiences(actor, targetTime);
    expect(result).toHaveLength(0);
  });

  it('excludes closed experience that ended before target', () => {
    const actor = makeActor({
      exp1: { id: 'exp1', name: 'Past', dateFrom: '2000-01-01', dateTo: '2005-01-01' }
    });
    const targetTime = Date.UTC(2010, 0, 1);
    const result = findOverlappingExperiences(actor, targetTime);
    expect(result).toHaveLength(0);
  });

  it('finds multiple overlapping experiences', () => {
    const actor = makeActor({
      exp1: { id: 'exp1', name: 'Work', dateFrom: '2010-01-01', dateTo: '' },
      exp2: { id: 'exp2', name: 'Side Project', dateFrom: '2012-06-01', dateTo: '2015-12-31' }
    });
    const targetTime = Date.UTC(2013, 0, 1);
    const result = findOverlappingExperiences(actor, targetTime);
    expect(result).toHaveLength(2);
  });

  it('handles actor with no eras', () => {
    const actor = { system: { eras: {} } };
    const result = findOverlappingExperiences(actor, Date.now());
    expect(result).toHaveLength(0);
  });
});