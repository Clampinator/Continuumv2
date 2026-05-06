import { describe, it, expect } from 'vitest';
import { findLastKnownLocation } from '../../../modules/lifeline/services/context-finder/find-last-known-location.js';

// Data shape matches getActorHistory() output:
// { id, sort, record: { eventAge, eventLocation, eventIsSpan, eventSpanToLocation, eventSpanFromLocation, ... } }
const makeFact = (id, sort, record) => ({ id, sort, record });

describe('findLastKnownLocation', () => {
  it('returns Unknown for empty history', () => {
    expect(findLastKnownLocation([], 100)).toBe('Unknown');
    expect(findLastKnownLocation(null, 100)).toBe('Unknown');
  });

  it('finds location from a level event in record shape', () => {
    const history = [
      makeFact('e1', 1, { eventAge: 50, eventLocation: 'Paris', eventIsSpan: false }),
    ];
    expect(findLastKnownLocation(history, 100)).toBe('Paris');
  });

  it('skips events after the startAge', () => {
    const history = [
      makeFact('e1', 1, { eventAge: 200, eventLocation: 'Tokyo', eventIsSpan: false }),
      makeFact('e2', 2, { eventAge: 50, eventLocation: 'Paris', eventIsSpan: false }),
    ];
    // Only e2 is <= startAge 100
    expect(findLastKnownLocation(history, 100)).toBe('Paris');
  });

  it('finds span destination location', () => {
    const history = [
      makeFact('span1', 1, {
        eventAge: 50,
        eventLocation: '',
        eventIsSpan: true,
        eventSpanToLocation: 'Mars',
        eventSpanFromLocation: 'Earth'
      }),
    ];
    expect(findLastKnownLocation(history, 100)).toBe('Mars');
  });

  it('finds span origin location when dest location is empty', () => {
    const history = [
      makeFact('span1', 1, {
        eventAge: 50,
        eventLocation: '',
        eventIsSpan: true,
        eventSpanFromLocation: 'Earth',
        eventSpanToLocation: ''
      }),
    ];
    expect(findLastKnownLocation(history, 100)).toBe('Earth');
  });

  it('prefers eventLocation over span locations', () => {
    const history = [
      makeFact('e1', 1, {
        eventAge: 50,
        eventLocation: 'Paris',
        eventIsSpan: true,
        eventSpanToLocation: 'Mars'
      }),
    ];
    expect(findLastKnownLocation(history, 100)).toBe('Paris');
  });

  it('walks backward through events to find the most recent location', () => {
    const history = [
      makeFact('e1', 1, { eventAge: 30, eventLocation: 'London', eventIsSpan: false }),
      makeFact('e2', 2, { eventAge: 40, eventLocation: '', eventIsSpan: false }),
      makeFact('e3', 3, { eventAge: 50, eventLocation: 'Berlin', eventIsSpan: false }),
    ];
    // startAge=45: e1(30) and e2(40) qualify; e3(50) is too recent
    // Sorted descending by age, e2 comes first but has no location, so e1's London is found
    expect(findLastKnownLocation(history, 45)).toBe('London');
  });

  it('works with top-level .age fallback (legacy shape)', () => {
    // Some callers may pass physics nodes with .age at top level
    const history = [
      { id: 'e1', sort: 1, age: 50, eventLocation: 'Berlin' },
    ];
    expect(findLastKnownLocation(history, 100)).toBe('Berlin');
  });

  it('skips empty string locations', () => {
    const history = [
      makeFact('e1', 1, { eventAge: 30, eventLocation: '  ', eventIsSpan: false }),
      makeFact('e2', 2, { eventAge: 20, eventLocation: 'Paris', eventIsSpan: false }),
    ];
    // e1 has whitespace-only location (skipped), e2 has Paris
    expect(findLastKnownLocation(history, 100)).toBe('Paris');
  });
});