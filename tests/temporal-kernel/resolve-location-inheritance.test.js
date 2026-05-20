import { describe, it, expect } from 'vitest';
import { resolveLocationInheritance } from '/systems/continuum-v2/modules/temporal-kernel/resolve-location-inheritance.js';

// Minimal history factory for tests
function makeHistory(events) {
  return events.map((e, i) => ({
    id: e.id || `evt${i}`,
    sort: e.sort ?? i,
    record: {
      eventAge: e.age ?? 0,
      eventLocation: e.loc || '',
      eventSpanFromLocation: e.spanFromLoc || '',
      eventSpanToLocation: e.spanToLoc || '',
      eventIsSpan: Boolean(e.isSpan),
      locationInherited: e.locInherited,
      spanFromLocationInherited: e.spanFromInherited,
      spanToLocationInherited: e.spanToInherited
    },
    path: `system.eras.era0.events.evt${i}`
  }));
}

const actor = {
  system: {
    personal: { birthLocation: 'Birthplace' }
  }
};

describe('resolveLocationInheritance', () => {
  it('new event matching default location is inherited', () => {
    const history = makeHistory([
      { age: 100, loc: 'Melbourne', locInherited: false }
    ]);
    const result = resolveLocationInheritance(history, {
      eventAge: 200,
      eventLocation: 'Melbourne',
      eventSpanFromLocation: '',
      eventSpanToLocation: ''
    }, null, actor);
    expect(result.locationInherited).toBe(true);
  });

  it('new event differing from default location is manual', () => {
    const history = makeHistory([
      { age: 100, loc: 'Melbourne', locInherited: false }
    ]);
    const result = resolveLocationInheritance(history, {
      eventAge: 200,
      eventLocation: 'Sydney',
      eventSpanFromLocation: '',
      eventSpanToLocation: ''
    }, null, actor);
    expect(result.locationInherited).toBe(false);
  });

  it('new event with empty location is inherited', () => {
    const history = makeHistory([
      { age: 100, loc: 'Melbourne', locInherited: false }
    ]);
    const result = resolveLocationInheritance(history, {
      eventAge: 200,
      eventLocation: '',
      eventSpanFromLocation: '',
      eventSpanToLocation: ''
    }, null, actor);
    expect(result.locationInherited).toBe(true);
  });

  it('parses formatted eventAge string correctly', () => {
    const history = makeHistory([
      { age: 94608000, loc: 'Paris', locInherited: false }
    ]);
    // "3y 0d 00:00:00" = 3 years in seconds
    const result = resolveLocationInheritance(history, {
      eventAge: '3y 0d 00:00:00',
      eventLocation: 'Paris',
      eventSpanFromLocation: '',
      eventSpanToLocation: ''
    }, null, actor);
    expect(result.locationInherited).toBe(true);
    expect(result.defaultLocation).toBe('Paris');
  });

  it('falls back to birthLocation when no history location exists', () => {
    const history = makeHistory([
      { age: 100, loc: '', locInherited: true }
    ]);
    const result = resolveLocationInheritance(history, {
      eventAge: 200,
      eventLocation: 'Birthplace',
      eventSpanFromLocation: '',
      eventSpanToLocation: ''
    }, null, actor);
    expect(result.locationInherited).toBe(true);
    expect(result.defaultLocation).toBe('Birthplace');
  });

  it('edit mode: unchanged location preserves old flag', () => {
    const history = makeHistory([
      { age: 100, loc: 'Melbourne', locInherited: false }
    ]);
    const oldRecord = { eventLocation: 'Melbourne', locationInherited: false };
    const result = resolveLocationInheritance(history, {
      eventAge: 100,
      eventLocation: 'Melbourne',
      eventSpanFromLocation: '',
      eventSpanToLocation: ''
    }, oldRecord, actor);
    // Location unchanged -> preserve old flag (false)
    expect(result.locationInherited).toBe(false);
  });

  it('edit mode: changed location is manual', () => {
    const oldRecord = { eventLocation: 'Melbourne', locationInherited: false };
    const history = makeHistory([
      { age: 100, loc: 'Melbourne', locInherited: false }
    ]);
    const result = resolveLocationInheritance(history, {
      eventAge: 100,
      eventLocation: 'Sydney',
      eventSpanFromLocation: '',
      eventSpanToLocation: ''
    }, oldRecord, actor);
    expect(result.locationInherited).toBe(false);
  });

  it('edit mode: unchanged inherited location stays inherited', () => {
    const oldRecord = { eventLocation: 'Melbourne', locationInherited: true };
    const history = makeHistory([
      { age: 100, loc: 'Melbourne', locInherited: false }
    ]);
    const result = resolveLocationInheritance(history, {
      eventAge: 100,
      eventLocation: 'Melbourne',
      eventSpanFromLocation: '',
      eventSpanToLocation: ''
    }, oldRecord, actor);
    expect(result.locationInherited).toBe(true);
  });

  it('span from location matching default is inherited', () => {
    const history = makeHistory([
      { age: 100, loc: 'Melbourne', locInherited: false }
    ]);
    const result = resolveLocationInheritance(history, {
      eventAge: 200,
      eventLocation: 'Melbourne',
      eventSpanFromLocation: 'Melbourne',
      eventSpanToLocation: ''
    }, null, actor);
    expect(result.spanFromLocationInherited).toBe(true);
  });

  it('span to location matching default is inherited', () => {
    const history = makeHistory([
      { age: 100, loc: 'Melbourne', locInherited: false }
    ]);
    const result = resolveLocationInheritance(history, {
      eventAge: 200,
      eventLocation: 'Melbourne',
      eventSpanFromLocation: '',
      eventSpanToLocation: 'Melbourne'
    }, null, actor);
    expect(result.spanToLocationInherited).toBe(true);
  });

  it('span arrival from previous span event provides default location', () => {
    const history = makeHistory([
      { age: 100, isSpan: true, loc: '', spanToLoc: 'Tokyo', spanToInherited: false }
    ]);
    const result = resolveLocationInheritance(history, {
      eventAge: 200,
      eventLocation: 'Tokyo',
      eventSpanFromLocation: '',
      eventSpanToLocation: ''
    }, null, actor);
    expect(result.locationInherited).toBe(true);
    expect(result.defaultLocation).toBe('Tokyo');
  });

  it('formatted age string "30y 242d 05:24:02" resolves past events', () => {
    // The root cause bug: formatted strings used to fail because
    // resolveDefaultLocation compared numbers against the raw string.
    // SECONDS_IN_YEAR = 31536000, SECONDS_IN_DAY = 86400
    const ageSeconds = 30 * 31536000 + 242 * 86400 + 5 * 3600 + 24 * 60 + 2;
    const history = makeHistory([
      { age: ageSeconds - 1000, loc: 'Berlin', locInherited: false }
    ]);
    const result = resolveLocationInheritance(history, {
      eventAge: '30y 242d 05:24:02',
      eventLocation: 'Berlin',
      eventSpanFromLocation: '',
      eventSpanToLocation: ''
    }, null, actor);
    expect(result.locationInherited).toBe(true);
    expect(result.defaultLocation).toBe('Berlin');
  });
});