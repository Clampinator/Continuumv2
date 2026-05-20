import { describe, it, expect } from 'vitest';
import { resolveDefaultLocation } from '../../modules/temporal-kernel/resolve-default-location.js';

const makeFact = (id, sort, record) => ({ id, sort, record, path: `system.eras.era0.events.${id}` });

describe('resolveDefaultLocation', () => {
  it('returns Unknown with null geo for empty history', () => {
    const result = resolveDefaultLocation([], 100);
    expect(result).toEqual({ location: 'Unknown', lat: null, lng: null, zoom: null });
  });

  it('returns Unknown with null geo for null history', () => {
    const result = resolveDefaultLocation(null, 100);
    expect(result).toEqual({ location: 'Unknown', lat: null, lng: null, zoom: null });
  });

  it('finds location and geo from a level event', () => {
    const history = [
      makeFact('e1', 1, { eventAge: 50, eventLocation: 'Paris', eventIsSpan: false, lat: 48.86, lng: 2.35, zoom: 12 }),
    ];
    const result = resolveDefaultLocation(history, 100);
    expect(result.location).toBe('Paris');
    expect(result.lat).toBe(48.86);
    expect(result.lng).toBe(2.35);
    expect(result.zoom).toBe(12);
  });

  it('skips events after the startAge', () => {
    const history = [
      makeFact('e1', 1, { eventAge: 200, eventLocation: 'Tokyo', eventIsSpan: false, lat: 35.68, lng: 139.69, zoom: 10 }),
      makeFact('e2', 2, { eventAge: 50, eventLocation: 'Paris', eventIsSpan: false, lat: 48.86, lng: 2.35, zoom: 12 }),
    ];
    const result = resolveDefaultLocation(history, 100);
    expect(result.location).toBe('Paris');
    expect(result.lat).toBe(48.86);
  });

  it('finds span arrival location and geo', () => {
    const history = [
      makeFact('span1', 1, {
        eventAge: 50,
        eventLocation: '',
        eventIsSpan: true,
        eventSpanToLocation: 'Mars',
        eventSpanFromLocation: 'Earth',
        eventSpanToLat: -18.4, eventSpanToLng: 55.5, eventSpanToZoom: 5,
        eventSpanFromLat: 0, eventSpanFromLng: 0, eventSpanFromZoom: 5,
        lat: null, lng: null, zoom: null
      }),
    ];
    const result = resolveDefaultLocation(history, 100);
    expect(result.location).toBe('Mars');
    expect(result.lat).toBe(-18.4);
    expect(result.lng).toBe(55.5);
  });

  it('finds span departure location when arrival is empty', () => {
    const history = [
      makeFact('span1', 1, {
        eventAge: 50,
        eventLocation: '',
        eventIsSpan: true,
        eventSpanFromLocation: 'Earth',
        eventSpanToLocation: '',
        eventSpanFromLat: 0, eventSpanFromLng: 0, eventSpanFromZoom: 5
      }),
    ];
    const result = resolveDefaultLocation(history, 100);
    expect(result.location).toBe('Earth');
    expect(result.lat).toBe(0);
    expect(result.lng).toBe(0);
  });

  it('prefers eventLocation over span locations', () => {
    const history = [
      makeFact('e1', 1, {
        eventAge: 50,
        eventLocation: 'Paris',
        eventIsSpan: true,
        eventSpanToLocation: 'Mars',
        lat: 48.86, lng: 2.35, zoom: 12
      }),
    ];
    const result = resolveDefaultLocation(history, 100);
    expect(result.location).toBe('Paris');
    expect(result.lat).toBe(48.86);
  });

  it('walks backward to find the most recent location', () => {
    const history = [
      makeFact('e1', 1, { eventAge: 30, eventLocation: 'London', eventIsSpan: false, lat: 51.5, lng: -0.12 }),
      makeFact('e2', 2, { eventAge: 40, eventLocation: '', eventIsSpan: false, lat: null, lng: null }),
      makeFact('e3', 3, { eventAge: 50, eventLocation: 'Berlin', eventIsSpan: false, lat: 52.52, lng: 13.4 }),
    ];
    // startAge=45: e1(30) and e2(40) qualify; e3(50) is too recent
    // e2 has no location, so e1's London is found
    const result = resolveDefaultLocation(history, 45);
    expect(result.location).toBe('London');
    expect(result.lat).toBe(51.5);
  });

  it('uses actor birthLocation as fallback', () => {
    const actor = { system: { personal: { birthLocation: 'Sydney' } } };
    const result = resolveDefaultLocation([], 100, actor);
    expect(result.location).toBe('Sydney');
    // Birth location has no geo
    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
  });

  it('skips whitespace-only locations', () => {
    const history = [
      makeFact('e1', 1, { eventAge: 30, eventLocation: '  ', eventIsSpan: false }),
      makeFact('e2', 2, { eventAge: 20, eventLocation: 'Paris', eventIsSpan: false, lat: 48.86, lng: 2.35 }),
    ];
    const result = resolveDefaultLocation(history, 100);
    expect(result.location).toBe('Paris');
    expect(result.lat).toBe(48.86);
  });

  it('works with top-level .age fallback (legacy physics node shape)', () => {
    const history = [
      { id: 'e1', sort: 1, age: 50, eventLocation: 'Berlin', lat: 52.52, lng: 13.4 },
    ];
    const result = resolveDefaultLocation(history, 100);
    expect(result.location).toBe('Berlin');
    expect(result.lat).toBe(52.52);
  });

  it('returns null geo when no geo has ever been set', () => {
    const history = [
      makeFact('e1', 1, { eventAge: 50, eventLocation: 'Paris', eventIsSpan: false }),
    ];
    const result = resolveDefaultLocation(history, 100);
    expect(result.location).toBe('Paris');
    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
    expect(result.zoom).toBeNull();
  });

  // BOUNDARY-TRACE: null-age facts MUST NOT match age-0 comparisons.
  // H4 changed getActorHistory to preserve null eventAge instead of
  // defaulting to 0. resolveDefaultLocation must exclude null-age
  // events from the reverse walk rather than treating them as age-0.
  it('excludes events with null eventAge from location resolution', () => {
    const history = [
      makeFact('e-null', 1, { eventAge: null, eventLocation: 'Nowhere', eventIsSpan: false }),
      makeFact('e-real', 2, { eventAge: 30, eventLocation: 'Paris', eventIsSpan: false, lat: 48.86, lng: 2.35 }),
    ];
    // null-age event should not match any target age
    const result = resolveDefaultLocation(history, 0);
    // Only e-real at age 30 is excluded (30 > 0), so e-null must also
    // be excluded (null age). Falls through to Unknown.
    expect(result.location).toBe('Unknown');
  });

  it('does not treat null eventAge as age-0 when walking backward', () => {
    const history = [
      makeFact('e-null', 1, { eventAge: null, eventLocation: 'GhostTown', eventIsSpan: false, lat: 0, lng: 0 }),
      makeFact('e-real', 2, { eventAge: 50, eventLocation: 'Paris', eventIsSpan: false, lat: 48.86, lng: 2.35 }),
    ];
    // At targetAge=100, both events qualify by age, but the null-age
    // event must be excluded from matching. Only Paris should be found.
    const result = resolveDefaultLocation(history, 100);
    expect(result.location).toBe('Paris');
    expect(result.lat).toBe(48.86);
  });

  it('skips null-age events and finds location from known-age event', () => {
    const history = [
      makeFact('e-null', 1, { eventAge: null, eventLocation: 'VoidCity', eventIsSpan: false }),
      makeFact('e-real', 2, { eventAge: 20, eventLocation: 'London', eventIsSpan: false, lat: 51.5, lng: -0.12 }),
    ];
    // At targetAge=25, e-real(20) qualifies. e-null is excluded.
    const result = resolveDefaultLocation(history, 25);
    expect(result.location).toBe('London');
    expect(result.lat).toBe(51.5);
  });
});