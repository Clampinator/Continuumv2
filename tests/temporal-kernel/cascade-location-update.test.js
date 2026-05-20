import { describe, it, expect } from 'vitest';
import { cascadeLocationUpdate } from '../../modules/temporal-kernel/cascade-location-update.js';

const makeFact = (id, sort, record) => ({ id, sort, record, path: `system.eras.era0.events.${id}` });

describe('cascadeLocationUpdate', () => {
  it('returns empty array for empty history', () => {
    const result = cascadeLocationUpdate([], 'e1', { eventLocation: 'Melbourne', lat: -37.8, lng: 144.9, zoom: 10 }, null, null);
    expect(result).toEqual([]);
  });

  it('returns empty array for null history', () => {
    const result = cascadeLocationUpdate(null, 'e1', { eventLocation: 'Melbourne', lat: -37.8, lng: 144.9, zoom: 10 }, null, null);
    expect(result).toEqual([]);
  });

  it('returns empty array when edited event is not found', () => {
    const history = [makeFact('e1', 1, { eventAge: 10, eventLocation: 'Sydney', locationInherited: true })];
    const result = cascadeLocationUpdate(history, 'missing', { eventLocation: 'Melbourne' }, null, null);
    expect(result).toEqual([]);
  });

  it('cascades level location to downstream inherited events', () => {
    const history = [
      makeFact('e1', 100, { eventAge: 10, eventLocation: 'Sydney', locationInherited: false }),
      makeFact('e2', 200, { eventAge: 20, eventLocation: 'Sydney', locationInherited: true }),
      makeFact('e3', 300, { eventAge: 30, eventLocation: 'Sydney', locationInherited: true }),
    ];
    const result = cascadeLocationUpdate(history, 'e1',
      { eventLocation: 'Melbourne', lat: -37.8, lng: 144.9, zoom: 10 },
      null, null
    );
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('e2');
    expect(result[0].fields.eventLocation).toBe('Melbourne');
    expect(result[0].fields.lat).toBe(-37.8);
    expect(result[0].fields.locationInherited).toBe(true);
    expect(result[1].id).toBe('e3');
    expect(result[1].fields.eventLocation).toBe('Melbourne');
  });

  it('stops cascade at manually-set location (locationInherited === false)', () => {
    const history = [
      makeFact('e1', 100, { eventAge: 10, eventLocation: 'Sydney', locationInherited: false }),
      makeFact('e2', 200, { eventAge: 20, eventLocation: 'Brisbane', locationInherited: false }),
      makeFact('e3', 300, { eventAge: 30, eventLocation: 'Sydney', locationInherited: true }),
    ];
    const result = cascadeLocationUpdate(history, 'e1',
      { eventLocation: 'Melbourne', lat: -37.8, lng: 144.9, zoom: 10 },
      null, null
    );
    // Cascade stops at e2 (locationInherited: false)
    expect(result).toHaveLength(0);
  });

  it('treats events without flag as inherited (backward compat)', () => {
    const history = [
      makeFact('e1', 100, { eventAge: 10, eventLocation: 'Sydney' }),
      makeFact('e2', 200, { eventAge: 20, eventLocation: 'Sydney' }),
    ];
    // No locationInherited flag on either event - both default to true
    const result = cascadeLocationUpdate(history, 'e1',
      { eventLocation: 'Melbourne', lat: -37.8, lng: 144.9, zoom: 10 },
      null, null
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e2');
    expect(result[0].fields.eventLocation).toBe('Melbourne');
  });

  it('cascades spanFromLocation independently of level location', () => {
    const history = [
      makeFact('e1', 100, { eventAge: 10, eventIsSpan: true, eventSpanFromLocation: 'Sydney', spanFromLocationInherited: false }),
      makeFact('e2', 200, { eventAge: 20, eventIsSpan: true, eventSpanFromLocation: 'Sydney', spanFromLocationInherited: true }),
    ];
    const result = cascadeLocationUpdate(history, 'e1',
      null,
      { eventLocation: 'Melbourne', lat: -37.8, lng: 144.9, zoom: 10 },
      null
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e2');
    expect(result[0].fields.eventSpanFromLocation).toBe('Melbourne');
  });

  it('cascades spanToLocation independently', () => {
    const history = [
      makeFact('e1', 100, { eventAge: 10, eventIsSpan: true, eventSpanToLocation: 'Sydney', spanToLocationInherited: false }),
      makeFact('e2', 200, { eventAge: 20, eventIsSpan: true, eventSpanToLocation: 'Sydney', spanToLocationInherited: true }),
    ];
    const result = cascadeLocationUpdate(history, 'e1',
      null, null,
      { eventLocation: 'Melbourne', lat: -37.8, lng: 144.9, zoom: 10 }
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e2');
    expect(result[0].fields.eventSpanToLocation).toBe('Melbourne');
  });

  it('each cascade stops independently at its own manual event', () => {
    const history = [
      makeFact('e1', 100, {
        eventAge: 10, eventLocation: 'Sydney',
        eventIsSpan: true, eventSpanFromLocation: 'Sydney', eventSpanToLocation: 'Sydney',
        locationInherited: false, spanFromLocationInherited: false, spanToLocationInherited: false
      }),
      makeFact('e2', 200, {
        eventAge: 20, eventLocation: 'Sydney',
        eventIsSpan: true, eventSpanFromLocation: 'Brisbane', eventSpanToLocation: 'Sydney',
        // Level: inherited (cascade continues), spanFrom: manual (cascade stops),
        // spanTo: inherited (cascade continues)
        locationInherited: true, spanFromLocationInherited: false, spanToLocationInherited: true
      }),
      makeFact('e3', 300, {
        eventAge: 30, eventLocation: 'Sydney',
        eventIsSpan: true, eventSpanFromLocation: 'Sydney', eventSpanToLocation: 'Sydney',
        locationInherited: true, spanFromLocationInherited: true, spanToLocationInherited: true
      }),
    ];
    const result = cascadeLocationUpdate(history, 'e1',
      { eventLocation: 'Melbourne', lat: -37.8, lng: 144.9, zoom: 10 },
      { eventLocation: 'Perth', lat: -31.9, lng: 115.8, zoom: 8 },
      { eventLocation: 'Adelaide', lat: -34.9, lng: 138.6, zoom: 9 }
    );

    // Level cascade: e2 (inherited) -> updated, e3 (inherited) -> updated
    // spanFrom cascade: e2 has spanFromLocationInherited: false -> stops
    // spanTo cascade: e2 (inherited) -> updated, e3 (inherited) -> updated

    // e2 should get level + spanTo updates (spanFrom stops at e2)
    const e2Update = result.find(r => r.id === 'e2');
    expect(e2Update).toBeDefined();
    expect(e2Update.fields.eventLocation).toBe('Melbourne');
    expect(e2Update.fields.eventSpanToLocation).toBe('Adelaide');
    expect(e2Update.fields.eventSpanFromLocation).toBeUndefined();

    // e3 gets level + spanTo (spanFrom already stopped at e2)
    const e3Update = result.find(r => r.id === 'e3');
    expect(e3Update).toBeDefined();
    expect(e3Update.fields.eventLocation).toBe('Melbourne');
    expect(e3Update.fields.eventSpanToLocation).toBe('Adelaide');
    // spanFrom cascade stopped at e2, so e3's spanFrom is NOT updated
    expect(e3Update.fields.eventSpanFromLocation).toBeUndefined();
  });

  it('skips the NOW node', () => {
    const history = [
      makeFact('e1', 100, { eventAge: 10, eventLocation: 'Sydney', locationInherited: false }),
      makeFact('now', 999999999, { isNow: true, eventLocation: '', locationInherited: true }),
      makeFact('e2', 200, { eventAge: 20, eventLocation: 'Sydney', locationInherited: true }),
    ];
    const result = cascadeLocationUpdate(history, 'e1',
      { eventLocation: 'Melbourne' }, null, null
    );
    // Should update e2 but not NOW
    const nowUpdate = result.find(r => r.id === 'now');
    expect(nowUpdate).toBeUndefined();
  });

  it('returns empty when all cascades are null (skip)', () => {
    const history = [
      makeFact('e1', 100, { eventAge: 10 }),
      makeFact('e2', 200, { eventAge: 20 }),
    ];
    const result = cascadeLocationUpdate(history, 'e1', null, null, null);
    expect(result).toEqual([]);
  });

  it('returns empty when no downstream events exist', () => {
    const history = [
      makeFact('e1', 100, { eventAge: 10, eventLocation: 'Sydney', locationInherited: false }),
    ];
    const result = cascadeLocationUpdate(history, 'e1',
      { eventLocation: 'Melbourne' }, null, null
    );
    expect(result).toEqual([]);
  });

  it('merges multiple cascade fields into a single update per event', () => {
    const history = [
      makeFact('e1', 100, {
        eventAge: 10, eventLocation: 'Sydney',
        eventIsSpan: true, eventSpanFromLocation: 'Sydney', eventSpanToLocation: 'Sydney',
        locationInherited: false, spanFromLocationInherited: false, spanToLocationInherited: false
      }),
      makeFact('e2', 200, {
        eventAge: 20, eventLocation: 'Sydney',
        eventIsSpan: true, eventSpanFromLocation: 'Sydney', eventSpanToLocation: 'Sydney',
        locationInherited: true, spanFromLocationInherited: true, spanToLocationInherited: true
      }),
    ];
    const result = cascadeLocationUpdate(history, 'e1',
      { eventLocation: 'Melbourne', lat: -37.8, lng: 144.9, zoom: 10 },
      { eventLocation: 'Perth', lat: -31.9, lng: 115.8, zoom: 8 },
      { eventLocation: 'Adelaide', lat: -34.9, lng: 138.6, zoom: 9 }
    );
    // All three cascades hit e2 - should be one merged entry
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e2');
    expect(result[0].fields.eventLocation).toBe('Melbourne');
    expect(result[0].fields.eventSpanFromLocation).toBe('Perth');
    expect(result[0].fields.eventSpanToLocation).toBe('Adelaide');
  });

  // SEMANTIC BRIDGE: When a level event's location changes, the caller
  // should pass the same location values for all three cascades. This test
  // verifies that cascade correctly writes to span fields when the level
  // change also drives spanFrom and spanTo cascades.
  it('level location change cascades into span From and To when caller passes same values', () => {
    const history = [
      makeFact('e1', 100, {
        eventAge: 10, eventLocation: 'Sydney', eventIsSpan: false,
        locationInherited: false
      }),
      makeFact('e2', 200, {
        eventAge: 20, eventLocation: 'Sydney', eventIsSpan: false,
        locationInherited: true
      }),
      makeFact('span1', 300, {
        eventAge: 30, eventLocation: 'Sydney', eventIsSpan: true,
        eventSpanFromLocation: 'Sydney', eventSpanToLocation: 'Sydney',
        locationInherited: true, spanFromLocationInherited: true, spanToLocationInherited: true
      }),
      makeFact('e3', 400, {
        eventAge: 40, eventLocation: 'Sydney', eventIsSpan: false,
        locationInherited: true
      }),
    ];
    // Simulate: user edited e1 from Sydney to Melbourne.
    // The caller (handle-submit) passes Melbourne for all three cascades.
    const melbVals = { eventLocation: 'Melbourne', lat: -37.8, lng: 144.9, zoom: 10 };
    const result = cascadeLocationUpdate(history, 'e1',
      melbVals, melbVals, melbVals
    );

    // e2 (level) gets eventLocation = Melbourne
    const e2Update = result.find(r => r.id === 'e2');
    expect(e2Update).toBeDefined();
    expect(e2Update.fields.eventLocation).toBe('Melbourne');

    // span1 (span) gets all three: eventLocation, spanFrom, spanTo
    const span1Update = result.find(r => r.id === 'span1');
    expect(span1Update).toBeDefined();
    expect(span1Update.fields.eventLocation).toBe('Melbourne');
    expect(span1Update.fields.eventSpanFromLocation).toBe('Melbourne');
    expect(span1Update.fields.eventSpanToLocation).toBe('Melbourne');
    expect(span1Update.fields.lat).toBe(-37.8);
    expect(span1Update.fields.lng).toBe(144.9);

    // e3 (level) gets eventLocation = Melbourne
    const e3Update = result.find(r => r.id === 'e3');
    expect(e3Update).toBeDefined();
    expect(e3Update.fields.eventLocation).toBe('Melbourne');
  });
});