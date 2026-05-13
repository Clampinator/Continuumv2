import { describe, it, expect } from 'vitest';
import { classifyEventType } from '/systems/continuum-v2/modules/temporal-kernel/classify-event-type.js';

describe('classifyEventType', () => {
  // BOUNDARY-TRACE: Level event with identical From/To must NOT
  // become a span. The arrival matches the departure exactly.
  it('level event with identical From/To dates produces eventIsSpan false', () => {
    const result = classifyEventType({
      eventIsSpan: false,
      eventSpanFromDate: '2020-01-01',
      eventSpanToDate: '2020-01-01',
      eventSpanFromTime: '12:00:00',
      eventSpanToTime: '12:00:00',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: 'London'
    }, { spanDisabled: false });

    expect(result.eventIsSpan).toBe(false);
    expect(result.hasSpanFacts).toBe(false);
  });

  // BOUNDARY-TRACE: Populated but identical span fields do not
  // constitute vertical displacement.
  it('level event with populated but identical span fields -> eventIsSpan false', () => {
    const result = classifyEventType({
      eventIsSpan: false,
      eventSpanFromDate: '2020-03-15',
      eventSpanToDate: '2020-03-15',
      eventSpanFromTime: '14:00:00',
      eventSpanToTime: '14:00:00',
      eventDate: '2020-03-15',
      eventTime: '14:00:00',
      eventLocation: 'Paris',
      eventSpanFromLocation: 'Paris'
    }, { spanDisabled: false });

    expect(result.eventIsSpan).toBe(false);
    expect(result.hasSpanFacts).toBe(false);
  });

  // BOUNDARY-TRACE: Different arrival date is physical evidence
  // of a span. eventIsSpan must be true.
  it('span event with different To/From dates -> eventIsSpan true', () => {
    const result = classifyEventType({
      eventIsSpan: false,
      eventSpanFromDate: '2020-01-01',
      eventSpanToDate: '2020-06-15',
      eventSpanFromTime: '12:00:00',
      eventSpanToTime: '16:00:00',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: 'London'
    }, { spanDisabled: false });

    expect(result.eventIsSpan).toBe(true);
    expect(result.hasSpanFacts).toBe(true);
  });

  // BOUNDARY-TRACE: Different arrival time (same date) is still
  // physical evidence of a span.
  it('span event with different To/From times but same date -> eventIsSpan true', () => {
    const result = classifyEventType({
      eventIsSpan: false,
      eventSpanFromDate: '2020-01-01',
      eventSpanToDate: '2020-01-01',
      eventSpanFromTime: '08:00:00',
      eventSpanToTime: '16:00:00',
      eventDate: '2020-01-01',
      eventTime: '08:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: 'London'
    }, { spanDisabled: false });

    expect(result.eventIsSpan).toBe(true);
    expect(result.hasSpanFacts).toBe(true);
  });

  // BOUNDARY-TRACE: spanDisabled is a physics veto. Even with
  // explicit span intent and physical evidence, Rank 0 characters
  // cannot span.
  it('spanDisabled true always produces eventIsSpan false', () => {
    const result = classifyEventType({
      eventIsSpan: true,
      eventSpanFromDate: '2020-01-01',
      eventSpanToDate: '2020-06-15',
      eventSpanFromTime: '12:00:00',
      eventSpanToTime: '16:00:00',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: 'London'
    }, { spanDisabled: true });

    expect(result.eventIsSpan).toBe(false);
  });

  // BOUNDARY-TRACE: An explicit flag must be honored unless
  // spanDisabled vetoes it.
  it('explicit eventIsSpan true flag produces eventIsSpan true', () => {
    const result = classifyEventType({
      eventIsSpan: true,
      eventSpanFromDate: '2020-01-01',
      eventSpanToDate: '2020-01-01',
      eventSpanFromTime: '12:00:00',
      eventSpanToTime: '12:00:00',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: 'London'
    }, { spanDisabled: false });

    expect(result.eventIsSpan).toBe(true);
    expect(result.hasSpanFacts).toBe(false);
  });

  // BOUNDARY-TRACE: Explicit flag AND physical evidence both
  // present. Still true, no conflict.
  it('explicit eventIsSpan true with hasSpanFacts -> eventIsSpan true', () => {
    const result = classifyEventType({
      eventIsSpan: true,
      eventSpanFromDate: '2020-01-01',
      eventSpanToDate: '2025-06-15',
      eventSpanFromTime: '12:00:00',
      eventSpanToTime: '16:00:00',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: 'London'
    }, { spanDisabled: false });

    expect(result.eventIsSpan).toBe(true);
    expect(result.hasSpanFacts).toBe(true);
  });
});

describe('classifyEventType normalization', () => {
  // When eventIsSpan is true and span From fields are blank,
  // the level fields should fill them in.
  it('normalizes blank span From fields from level fields when eventIsSpan', () => {
    const result = classifyEventType({
      eventIsSpan: true,
      eventSpanFromDate: '',
      eventSpanToDate: '2025-06-15',
      eventSpanFromTime: '',
      eventSpanToTime: '16:00:00',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: ''
    }, { spanDisabled: false });

    expect(result.normalizedFacts.eventSpanFromDate).toBe('2020-01-01');
    expect(result.normalizedFacts.eventSpanFromTime).toBe('12:00:00');
    expect(result.normalizedFacts.eventSpanFromLocation).toBe('London');
  });

  // When eventIsSpan is false, normalization should NOT fill in
  // the span From fields from level fields.
  it('does not normalize span From fields for level events', () => {
    const result = classifyEventType({
      eventIsSpan: false,
      eventSpanFromDate: '',
      eventSpanToDate: '',
      eventSpanFromTime: '',
      eventSpanToTime: '',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: ''
    }, { spanDisabled: false });

    expect(result.normalizedFacts.eventSpanFromDate).toBe('');
    expect(result.normalizedFacts.eventSpanFromTime).toBe('');
    expect(result.normalizedFacts.eventSpanFromLocation).toBe('');
  });

  // When span From fields are already populated, they should not
  // be overwritten by level fields.
  it('preserves existing span From fields when already populated', () => {
    const result = classifyEventType({
      eventIsSpan: true,
      eventSpanFromDate: '2020-03-01',
      eventSpanToDate: '2025-06-15',
      eventSpanFromTime: '09:00:00',
      eventSpanToTime: '16:00:00',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: 'Manchester'
    }, { spanDisabled: false });

    expect(result.normalizedFacts.eventSpanFromDate).toBe('2020-03-01');
    expect(result.normalizedFacts.eventSpanFromTime).toBe('09:00:00');
    expect(result.normalizedFacts.eventSpanFromLocation).toBe('Manchester');
  });

  // normalizedFacts mirrors eventIsSpan from the classification result.
  it('normalizedFacts.eventIsSpan matches classification result', () => {
    const result = classifyEventType({
      eventIsSpan: false,
      eventSpanFromDate: '2020-01-01',
      eventSpanToDate: '2025-06-15',
      eventSpanFromTime: '12:00:00',
      eventSpanToTime: '16:00:00',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: 'London'
    }, { spanDisabled: false });

    // hasSpanFacts is true (different dates), so eventIsSpan is true
    expect(result.normalizedFacts.eventIsSpan).toBe(true);
    expect(result.normalizedFacts.eventIsSpan).toBe(result.eventIsSpan);
  });

  // When departure is blank but arrival is filled, the raw field
  // comparison finds span facts (blank !== filled). This matches the
  // original handle-submit behavior. The level date fallback only
  // happens during normalization AFTER classification.
  it('blank departure with filled arrival produces hasSpanFacts true (raw comparison)', () => {
    // Arrival date differs from blank departure
    const resultA = classifyEventType({
      eventIsSpan: false,
      eventSpanFromDate: '',
      eventSpanToDate: '2025-06-15',
      eventSpanFromTime: '',
      eventSpanToTime: '16:00:00',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: ''
    }, { spanDisabled: false });

    // Blank !== filled -> hasSpanFacts is true
    expect(resultA.hasSpanFacts).toBe(true);
    expect(resultA.eventIsSpan).toBe(true);
    // Normalization fills From fields from level date
    expect(resultA.normalizedFacts.eventSpanFromDate).toBe('2020-01-01');
    expect(resultA.normalizedFacts.eventSpanFromTime).toBe('12:00:00');

    // Arrival matches blank departure (both blank) -> no span facts
    const resultB = classifyEventType({
      eventIsSpan: false,
      eventSpanFromDate: '',
      eventSpanToDate: '',
      eventSpanFromTime: '',
      eventSpanToTime: '',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: 'London',
      eventSpanFromLocation: ''
    }, { spanDisabled: false });

    // Both blank -> hasSpanFacts is false
    expect(resultB.hasSpanFacts).toBe(false);
    expect(resultB.eventIsSpan).toBe(false);
  });

  // Edge case: undefined constraints should default spanDisabled to false.
  it('handles undefined constraints gracefully', () => {
    const result = classifyEventType({
      eventIsSpan: false,
      eventSpanFromDate: '',
      eventSpanToDate: '',
      eventSpanFromTime: '',
      eventSpanToTime: '',
      eventDate: '2020-01-01',
      eventTime: '12:00:00',
      eventLocation: '',
      eventSpanFromLocation: ''
    }, undefined);

    expect(result.eventIsSpan).toBe(false);
    expect(result.hasSpanFacts).toBe(false);
  });
});