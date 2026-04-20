/**
 * Divides a stream of events into chronological segments.
 * A new segment is created whenever a Span event occurs.
 * 
 * @param {Array} events - Sorted array of events.
 * @returns {Array} Array of segments.
 */
export function calculateSegments(events) {
  if (!events || events.length === 0) return [];

  const segments = [];
  let currentSegment = null;

  for (const event of events) {
    if (!currentSegment || event.isSpan) {
      // Create new segment
      currentSegment = {
        startAge: event.age,
        startTime: event.isSpan ? event.arrivalTime : event.time,
        events: []
      };
      segments.push(currentSegment);
    }
    
    // In the case of a span, the span event itself marks the start of the NEW segment
    // But it also exists as the departure point. 
    // Actually, lore-wise, a Span is an instantaneous jump.
    // The previous implementation used the Span as the start of the new rail.
    currentSegment.events.push(event);
  }

  return segments;
}
