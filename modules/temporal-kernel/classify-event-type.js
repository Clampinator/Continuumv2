/**
 * TEMPORAL KERNEL: CLASSIFY EVENT TYPE
 *
 * Pure function. Determines whether an event is a Span (vertical
 * displacement) or a Level event based on raw form facts, and
 * normalizes span From fields when they are missing.
 *
 * Authority: This is the SOLE function that classifies event type.
 * UI handlers must NOT compute hasSpanFacts or eventIsSpan inline.
 *
 * Classification uses RAW form fields: if the arrival fields differ
 * from the departure fields, the event has span facts (vertical
 * displacement). This matches the original handle-submit behavior.
 *
 * Normalization happens AFTER classification: when the event is
 * classified as a span but the departure fields are blank, the
 * level fields fill in as departure defaults. This mirrors physical
 * reality - a span's departure is "where/when you already are"
 * unless explicitly overridden.
 *
 * @param {Object} rawFacts - Raw form values.
 *   { eventIsSpan, eventSpanFromDate, eventSpanToDate,
 *     eventSpanFromTime, eventSpanToTime, eventDate, eventTime,
 *     eventLocation, eventSpanFromLocation }
 * @param {Object} constraints - Physics constraints.
 *   { spanDisabled: boolean }
 * @returns {{ eventIsSpan: boolean, hasSpanFacts: boolean, normalizedFacts: Object }}
 */
export function classifyEventType(rawFacts, constraints) {
  const {
    eventIsSpan: rawIsSpan,
    eventSpanFromDate,
    eventSpanToDate,
    eventSpanFromTime,
    eventSpanToTime,
    eventDate,
    eventTime,
    eventLocation,
    eventSpanFromLocation
  } = rawFacts;

  const spanDisabled = Boolean(constraints?.spanDisabled);

  // AUTHORITY: Check for physical evidence of a Span (vertical
  // displacement). If the Arrival facts differ from the Departure
  // facts, it IS a span. Uses raw form fields - a blank departure
  // with a filled arrival is still span evidence (the user filled
  // in "where I'm going" but not "where I'm leaving from").
  const hasSpanFacts =
    (Boolean(eventSpanToDate) && eventSpanToDate !== eventSpanFromDate) ||
    (Boolean(eventSpanToTime) && eventSpanToTime !== eventSpanFromTime);

  // PHYSICS VETO: If spanDisabled is true (Level Breath or Rank 0),
  // force eventIsSpan to false regardless of user intent or physical
  // evidence. The span checkbox is disabled in the template, but we
  // enforce it here as a safety net.
  const eventIsSpan = spanDisabled
    ? false
    : Boolean(rawIsSpan || hasSpanFacts);

  // SPAN FROM NORMALIZATION: When this event is classified as a
  // span but the departure fields are blank, fall back to the level
  // fields. A span's departure defaults to "where/when you already
  // are". This MUST use the final eventIsSpan, not the raw intent,
  // because hasSpanFacts can promote a level intent to a span.
  const normalizedSpanFromDate = eventIsSpan
    ? (eventSpanFromDate || eventDate || '')
    : (eventSpanFromDate || '');
  const normalizedSpanFromTime = eventIsSpan
    ? (eventSpanFromTime || eventTime || '')
    : (eventSpanFromTime || '');
  const normalizedSpanFromLocation = eventIsSpan
    ? (eventSpanFromLocation || eventLocation || '')
    : (eventSpanFromLocation || '');

  const normalizedFacts = {
    eventIsSpan,
    eventSpanFromDate: normalizedSpanFromDate,
    eventSpanToDate: eventSpanToDate || '',
    eventSpanFromTime: normalizedSpanFromTime,
    eventSpanToTime: eventSpanToTime || '',
    eventSpanFromLocation: normalizedSpanFromLocation
  };

  return { eventIsSpan, hasSpanFacts, normalizedFacts };
}