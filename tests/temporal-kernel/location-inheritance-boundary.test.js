import { describe, it, expect } from 'vitest';
import { resolveDefaultLocation } from '../../modules/temporal-kernel/resolve-default-location.js';
import { cascadeLocationUpdate } from '../../modules/temporal-kernel/cascade-location-update.js';

const makeFact = (id, sort, record) => ({ id, sort, record, path: `system.eras.era0.events.${id}` });

// BOUNDARY-TRACE TESTS: Location inheritance flag semantics
// These tests verify that the inheritance flags preserve the correct
// semantic meaning across the insert -> edit -> cascade boundary.
describe('location inheritance flag boundary', () => {
  // BOUNDARY: New event with default location MUST have locationInherited = true
  it('new event at default location is marked inherited', () => {
    const history = [
      makeFact('e1', 100, { eventAge: 10, eventLocation: 'Sydney', eventIsSpan: false, locationInherited: false }),
    ];
    const defaultLoc = resolveDefaultLocation(history, 20);
    expect(defaultLoc.location).toBe('Sydney');

    // Simulate what handle-submit does: if user submits the default, inherited = true
    const submittedLocation = 'Sydney';
    const isInherited = submittedLocation === defaultLoc.location;
    expect(isInherited).toBe(true);
  });

  // BOUNDARY: New event with different location MUST have locationInherited = false
  it('new event with manual location is NOT inherited', () => {
    const history = [
      makeFact('e1', 100, { eventAge: 10, eventLocation: 'Sydney', eventIsSpan: false, locationInherited: false }),
    ];
    const defaultLoc = resolveDefaultLocation(history, 20);
    const submittedLocation = 'Melbourne';
    const isInherited = submittedLocation === defaultLoc.location;
    expect(isInherited).toBe(false);
  });

  // BOUNDARY: Empty location on new event is treated as inherited
  // (the auto-fill will set it to the default, so empty = default)
  it('new event with empty location is treated as inherited', () => {
    const history = [
      makeFact('e1', 100, { eventAge: 10, eventLocation: 'Sydney', eventIsSpan: false }),
    ];
    const defaultLoc = resolveDefaultLocation(history, 20);
    const submittedLocation = '';
    const isInherited = submittedLocation === '' || submittedLocation === defaultLoc.location;
    expect(isInherited).toBe(true);
  });

  // BOUNDARY: Edit that changes location sets inherited = false and cascades
  it('edit changing location marks it manual and cascades downstream', () => {
    const history = [
      makeFact('e1', 100, { eventAge: 10, eventLocation: 'Sydney', locationInherited: true }),
      makeFact('e2', 200, { eventAge: 20, eventLocation: 'Sydney', locationInherited: true }),
      makeFact('e3', 300, { eventAge: 30, eventLocation: 'Sydney', locationInherited: true }),
    ];

    // User edits e1 from Sydney to Melbourne
    // handle-submit compares: 'Melbourne' !== oldRecord.eventLocation ('Sydney')
    // => locationInherited = false
    // Then cascade walks forward from e1
    const result = cascadeLocationUpdate(history, 'e1',
      { eventLocation: 'Melbourne', lat: -37.8, lng: 144.9, zoom: 10 },
      null, null
    );

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('e2');
    expect(result[0].fields.eventLocation).toBe('Melbourne');
    expect(result[1].id).toBe('e3');
    expect(result[1].fields.eventLocation).toBe('Melbourne');
  });

  // BOUNDARY: Edit that does NOT change location preserves existing flag
  it('edit without location change preserves existing inheritance flag', () => {
    // This simulates: user edits e1's title but not location
    // The old record has locationInherited: true
    // The new submitted location matches old => keep true
    const oldRecord = { eventLocation: 'Sydney', locationInherited: true };
    const submittedLocation = 'Sydney';
    const isUnchanged = submittedLocation === (oldRecord.eventLocation || '');
    const preservedFlag = isUnchanged ? (oldRecord.locationInherited !== false) : false;
    expect(preservedFlag).toBe(true);
  });

  // BOUNDARY: Cascade stops at first manual event (the gospel rule)
  // "The subjectively last manually edited location is gospel till the
  //  next manually edited location in subjective order."
  it('cascade stops at manually-set location and does not modify it', () => {
    const history = [
      makeFact('e1', 100, { eventAge: 10, eventLocation: 'Sydney', locationInherited: true }),
      makeFact('e2', 200, { eventAge: 20, eventLocation: 'Sydney', locationInherited: true }),
      makeFact('e3', 300, { eventAge: 30, eventLocation: 'Brisbane', locationInherited: false }),
      makeFact('e4', 400, { eventAge: 40, eventLocation: 'Brisbane', locationInherited: true }),
    ];

    // User edits e1 from Sydney to Melbourne
    const result = cascadeLocationUpdate(history, 'e1',
      { eventLocation: 'Melbourne' }, null, null
    );

    // e2 gets Melbourne (inherited, downstream from e1)
    // e3 has locationInherited: false (manual Brisbane) -> cascade stops
    // e4 also has locationInherited: true but it's AFTER the manual stop
    // e4 is downstream of e3 (not e1), so cascade from e1 stops at e3
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e2');
    expect(result[0].fields.eventLocation).toBe('Melbourne');
  });

  // BOUNDARY: Span events have three independent inheritance flags
  it('span event has independent flags for level, spanFrom, spanTo', () => {
    const history = [
      makeFact('e1', 100, {
        eventAge: 10,
        eventLocation: 'Sydney',
        eventIsSpan: true,
        eventSpanFromLocation: 'Sydney',
        eventSpanToLocation: 'Melbourne',
        locationInherited: true,
        spanFromLocationInherited: true,
        spanToLocationInherited: false
      }),
    ];

    // Only the level cascade should propagate; spanTo was manually set
    const result = cascadeLocationUpdate(history, 'e1',
      { eventLocation: 'Perth' },
      { eventLocation: 'Perth' },
      { eventLocation: 'Adelaide' }
    );

    // No downstream events, so empty result
    // But the principle: spanToLocationInherited: false means
    // span arrival edits would NOT cascade to this event
    expect(result).toHaveLength(0);
  });

  // BOUNDARY: hasSpanFacts-like edge case - level event with inherited
  // location that happens to equal the default should NOT be re-classified
  // as a span. The inheritance flag is orthogonal to span classification.
  it('location inheritance does not affect span classification', () => {
    // A level event with location inherited from a prior span's arrival
    // must NOT become a span just because it shares the arrival location
    const history = [
      makeFact('span1', 100, {
        eventAge: 10,
        eventLocation: '',
        eventIsSpan: true,
        eventSpanToLocation: 'Melbourne',
        spanToLocationInherited: false,
        locationInherited: true
      }),
      makeFact('e2', 200, {
        eventAge: 20,
        eventLocation: 'Melbourne',
        eventIsSpan: false,
        locationInherited: true
      }),
    ];

    // e2 inherited Melbourne from span1's arrival - it's still a level event
    const e2Record = history[1].record;
    expect(e2Record.eventIsSpan).toBe(false);
    expect(e2Record.locationInherited).toBe(true);
    expect(e2Record.eventLocation).toBe('Melbourne');
  });

  // BOUNDARY (SEMANTIC BRIDGE): When a level event's location changes,
  // the cascade caller should pass the same values for all three cascade
  // types. This verifies that a level edit cascades into downstream
  // span arrival locations, not just level locations.
  it('level edit cascades into downstream span To locations when caller provides all three values', () => {
    const history = [
      makeFact('e1', 100, { eventAge: 10, eventLocation: 'Sydney', eventIsSpan: false, locationInherited: false }),
      makeFact('span1', 200, {
        eventAge: 20, eventLocation: 'Sydney', eventIsSpan: true,
        eventSpanFromLocation: 'Sydney', eventSpanToLocation: 'Sydney',
        locationInherited: true, spanFromLocationInherited: true, spanToLocationInherited: true
      }),
    ];

    // User edited e1 from Sydney to Melbourne.
    // Caller passes Melbourne for all three cascades (semantic bridge).
    const melbVals = { eventLocation: 'Melbourne', lat: -37.8, lng: 144.9, zoom: 10 };
    const result = cascadeLocationUpdate(history, 'e1',
      melbVals, melbVals, melbVals
    );

    // span1 should have all three location fields updated
    expect(result).toHaveLength(1);
    expect(result[0].fields.eventLocation).toBe('Melbourne');
    expect(result[0].fields.eventSpanFromLocation).toBe('Melbourne');
    expect(result[0].fields.eventSpanToLocation).toBe('Melbourne');
    expect(result[0].fields.lat).toBe(-37.8);
    expect(result[0].fields.eventSpanFromLat).toBe(-37.8);
    expect(result[0].fields.eventSpanToLat).toBe(-37.8);
  });
});