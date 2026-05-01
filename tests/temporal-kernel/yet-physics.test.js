import { describe, it, expect } from 'vitest';
import { resolveYetNodes, isYetViolated } from '../../modules/temporal-kernel/yet-physics.js';

describe('isYetViolated (kernel)', () => {
  // Constants for test timestamps
  const NOW_AGE = 25 * 31536000; // 25 years in seconds
  const NOW_TIME = new Date('2025-01-01T12:00:00').getTime();

  it('should return false for a Yet with no locks (neither locked)', () => {
    const yet = { hasAge: false, hasDate: false, age: null, time: null };
    expect(isYetViolated(yet, NOW_AGE, NOW_TIME)).toBe(false);
  });

  it('should return false for nebulously drifting Yets regardless of NOW position', () => {
    // A drifting Yet can never be violated - you can always revisit a date later
    const yet = { hasAge: false, hasDate: false, age: null, time: null };
    expect(isYetViolated(yet, 999 * 31536000, NOW_TIME)).toBe(false);
  });

  it('should return true when age-locked AND now has passed the Yet age', () => {
    const yetAge = 20 * 31536000; // 20 years
    const yet = { hasAge: true, hasDate: false, age: yetAge, time: null };
    expect(isYetViolated(yet, NOW_AGE, NOW_TIME)).toBe(true);
  });

  it('should return false when age-locked AND now has NOT reached the Yet age', () => {
    const yetAge = 30 * 31536000; // 30 years (future)
    const yet = { hasAge: true, hasDate: false, age: yetAge, time: null };
    expect(isYetViolated(yet, NOW_AGE, NOW_TIME)).toBe(false);
  });

  it('should return false when age-locked AND now equals the Yet age exactly', () => {
    const yet = { hasAge: true, hasDate: false, age: NOW_AGE, time: null };
    expect(isYetViolated(yet, NOW_AGE, NOW_TIME)).toBe(false);
  });

  it('should return true for date-locked-only Yet when now time has passed Yet time', () => {
    const pastTime = new Date('2020-06-15T12:00:00').getTime();
    const yet = { hasAge: false, hasDate: true, age: null, time: pastTime };
    expect(isYetViolated(yet, NOW_AGE, NOW_TIME)).toBe(true);
  });

  it('should return false for date-locked-only Yet when now time has NOT reached Yet time', () => {
    const futureTime = new Date('2030-06-15T12:00:00').getTime();
    const yet = { hasAge: false, hasDate: true, age: null, time: futureTime };
    expect(isYetViolated(yet, NOW_AGE, NOW_TIME)).toBe(false);
  });

  it('should return true for both-locked Yet when now age exceeds Yet age (age takes precedence)', () => {
    // When both are locked, age violation is the primary check
    const yetAge = 20 * 31536000;
    const yetTime = new Date('2020-01-01T12:00:00').getTime();
    const yet = { hasAge: true, hasDate: true, age: yetAge, time: yetTime };
    expect(isYetViolated(yet, NOW_AGE, NOW_TIME)).toBe(true);
  });

  it('should return false for both-locked Yet when now has not exceeded either axis', () => {
    const yetAge = 30 * 31536000;
    const yetTime = new Date('2030-01-01T12:00:00').getTime();
    const yet = { hasAge: true, hasDate: true, age: yetAge, time: yetTime };
    expect(isYetViolated(yet, NOW_AGE, NOW_TIME)).toBe(false);
  });
});

describe('isYetViolated - boundary-trace tests (mandatory)', () => {
  // These tests verify the semantic invariant that data crossing a boundary
  // preserves its meaning correctly.

  it('age-locked Yet: NOW age exceeds Yet age must be violated', () => {
    const yetAge = 18 * 31536000;
    const yet = { hasAge: true, hasDate: false, age: yetAge, time: null };
    const result = isYetViolated(yet, 19 * 31536000, 0);
    expect(result).toBe(true);
  });

  it('age-locked Yet: NOW age exactly equals Yet age must NOT be violated', () => {
    const yetAge = 18 * 31536000;
    const yet = { hasAge: true, hasDate: false, age: yetAge, time: null };
    const result = isYetViolated(yet, yetAge, 0);
    expect(result).toBe(false);
  });

  it('date-locked Yet: NOW time exceeds Yet time must be violated', () => {
    const yetTime = new Date('2020-06-01T00:00:00').getTime();
    const nowTime = new Date('2020-07-01T00:00:00').getTime();
    const yet = { hasAge: false, hasDate: true, age: null, time: yetTime };
    expect(isYetViolated(yet, 0, nowTime)).toBe(true);
  });

  it('neither-locked Yet must NEVER be violated regardless of NOW position', () => {
    const yet = { hasAge: false, hasDate: false, age: null, time: null };
    // Even if NOW is far into the future
    expect(isYetViolated(yet, 100 * 31536000, Date.now())).toBe(false);
  });

  it('both-locked Yet: age violation triggers even if date is still future', () => {
    const yetAge = 20 * 31536000;
    const yetTime = new Date('2030-01-01T00:00:00').getTime();
    const nowAge = 25 * 31536000;
    const nowTime = new Date('2025-01-01T00:00:00').getTime();
    const yet = { hasAge: true, hasDate: true, age: yetAge, time: yetTime };
    // Age exceeded (25 > 20), even though date is still future
    expect(isYetViolated(yet, nowAge, nowTime)).toBe(true);
  });
});

describe('resolveYetNodes (kernel)', () => {
  const NOW_AGE = 25 * 31536000;
  const NOW_TIME = new Date('2025-01-01T12:00:00').getTime();

  it('should return empty array for null theYet', () => {
    expect(resolveYetNodes(null, NOW_AGE, NOW_TIME)).toEqual([]);
  });

  it('should return empty array for empty theYet', () => {
    expect(resolveYetNodes({}, NOW_AGE, NOW_TIME)).toEqual([]);
  });

  it('should skip Yets that are marked done', () => {
    const theYet = {
      yet1: { description: 'Completed Yet', done: true, age: '20', date: '', time: '' }
    };
    const result = resolveYetNodes(theYet, NOW_AGE, NOW_TIME);
    expect(result).toEqual([]);
  });

  it('should set hasAge=true and hasDate=false for age-only Yets', () => {
    const theYet = {
      yet1: { description: 'Age locked', done: false, age: '20', date: '', time: '', frag: 0 }
    };
    const result = resolveYetNodes(theYet, NOW_AGE, NOW_TIME);
    expect(result).toHaveLength(1);
    expect(result[0].hasAge).toBe(true);
    expect(result[0].hasDate).toBe(false);
  });

  it('should set hasAge=false and hasDate=true for date-only Yets', () => {
    const theYet = {
      yet1: { description: 'Date locked', done: false, age: null, date: '2024-06-15', time: '12:00:00', frag: 0 }
    };
    const result = resolveYetNodes(theYet, NOW_AGE, NOW_TIME);
    expect(result).toHaveLength(1);
    expect(result[0].hasAge).toBe(false);
    expect(result[0].hasDate).toBe(true);
  });

  it('should set both hasAge and hasDate for fully-locked Yets', () => {
    const theYet = {
      yet1: { description: 'Fully locked', done: false, age: '20', date: '2024-06-15', time: '12:00:00', frag: 0 }
    };
    const result = resolveYetNodes(theYet, NOW_AGE, NOW_TIME);
    expect(result).toHaveLength(1);
    expect(result[0].hasAge).toBe(true);
    expect(result[0].hasDate).toBe(true);
  });

  it('should set neither hasAge nor hasDate for drifting Yets', () => {
    const theYet = {
      yet1: { description: 'Nebulous', done: false, age: null, date: '', time: '', frag: 0 }
    };
    const result = resolveYetNodes(theYet, NOW_AGE, NOW_TIME);
    expect(result).toHaveLength(1);
    expect(result[0].hasAge).toBe(false);
    expect(result[0].hasDate).toBe(false);
  });

  it('should position age-locked Yets at their locked age, tracking NOW time', () => {
    const theYet = {
      yet1: { description: 'Age locked', done: false, age: '20', date: '', time: '', frag: 0 }
    };
    const result = resolveYetNodes(theYet, NOW_AGE, NOW_TIME);
    // worldAge should be 20 years (locked), worldTime should track NOW
    expect(result[0].worldAge).toBe(20 * 31536000);
    expect(result[0].worldTime).toBe(NOW_TIME);
  });

  it('should position date-locked Yets at their locked time, tracking NOW age', () => {
    const yetTime = new Date('2030-06-15T12:00:00').getTime();
    const theYet = {
      yet1: { description: 'Date locked', done: false, age: null, date: '2030-06-15', time: '12:00:00', frag: 0 }
    };
    const result = resolveYetNodes(theYet, NOW_AGE, NOW_TIME);
    expect(result[0].worldAge).toBe(NOW_AGE);
    expect(result[0].worldTime).toBe(yetTime);
  });

  it('should position fully-locked Yets at their exact coordinates', () => {
    const yetAge = 20 * 31536000;
    const yetTime = new Date('2030-06-15T12:00:00').getTime();
    const theYet = {
      yet1: { description: 'Fully locked', done: false, age: '20', date: '2030-06-15', time: '12:00:00', frag: 0 }
    };
    const result = resolveYetNodes(theYet, NOW_AGE, NOW_TIME);
    expect(result[0].worldAge).toBe(yetAge);
    expect(result[0].worldTime).toBe(yetTime);
  });

  it('should position drifting Yets ahead of NOW with offset', () => {
    const theYet = {
      yet1: { description: 'Nebulous', done: false, age: null, date: '', time: '', frag: 0 }
    };
    const result = resolveYetNodes(theYet, NOW_AGE, NOW_TIME);
    // Drifting Yets should be ahead of NOW by DRIFT_AHEAD_SECONDS
    expect(result[0].worldAge).toBeGreaterThan(NOW_AGE);
    expect(result[0].worldTime).toBe(NOW_TIME);
  });

  it('should mark age-locked Yets as violated when NOW exceeds their age', () => {
    const theYet = {
      yet1: { description: 'Past age', done: false, age: '10', date: '', time: '', frag: 0 }
    };
    const result = resolveYetNodes(theYet, NOW_AGE, NOW_TIME);
    expect(result[0].isViolated).toBe(true);
  });

  it('should mark neither-locked Yets as never violated', () => {
    const theYet = {
      yet1: { description: 'Nebulous', done: false, age: null, date: '', time: '', frag: 0 }
    };
    const result = resolveYetNodes(theYet, NOW_AGE, NOW_TIME);
    expect(result[0].isViolated).toBe(false);
  });

  it('should suppress violation when isFragSuppressed is true', () => {
    const theYet = {
      yet1: { description: 'Suppressed', done: false, age: '10', date: '', time: '', frag: 3, isFragSuppressed: true }
    };
    const result = resolveYetNodes(theYet, NOW_AGE, NOW_TIME);
    expect(result[0].isViolated).toBe(false);
  });

  it('should pass frag value through to render data', () => {
    const theYet = {
      yet1: { description: 'Fragged', done: false, age: '10', date: '', time: '', frag: 5 }
    };
    const result = resolveYetNodes(theYet, NOW_AGE, NOW_TIME);
    expect(result[0].frag).toBe(5);
  });
});