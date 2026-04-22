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
  
  // AUTHORITY: Force startTime to a Number to prevent NaN/Horizontal projection
  let currentSegment = {
    startAge: 0,
    startTime: Number(events[0]?.time) || 0,
    events: []
  };

  segments.push(currentSegment);

  for (const event of events) {
    if (event.isSpan) {
      // Start a new segment after the jump
      const newSegment = {
        startAge: Number(event.age) || 0,
        startTime: Number(event.arrivalTime) || 0,
        events: []
      };
      
      // The Span event exists as the departure point. 
      currentSegment.events.push(event);
      
      currentSegment = newSegment;
      segments.push(currentSegment);
      continue;
    }
    
    currentSegment.events.push(event);
  }

  return segments;
}
