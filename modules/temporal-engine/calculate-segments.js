/**
 * Divides a stream of events into chronological segments.
 * A new segment is created whenever a Span event occurs.
 * 
 * @param {Array} events - Sorted array of events.
 * @param {number} originTime - Actor's DoB timestamp (ms).
 * @returns {Array} Array of segments.
 */
export function calculateSegments(events, originTime = 0) {
  const segments = [];
  
  // AUTHORITY: Always initialize the first segment at Birth (Age 0).
  // Use originTime if no events exist or if the first event is after Birth.
  const firstEventTime = events.length > 0 ? Number(events[0].time) : originTime;
  
  let currentSegment = {
    startAge: 0,
    startTime: originTime || firstEventTime,
    events: []
  };

  segments.push(currentSegment);

  for (const event of events) {
    if (event.isSpan) {
      // 1. END THE CURRENT SEGMENT (at Departure)
      currentSegment.exitPoint = event;

      // 2. START THE NEXT SEGMENT (at Arrival)
      currentSegment = {
        startAge: Number(event.age) || 0,
        startTime: Number(event.arrivalTime) || 0,
        events: [],
        arrivalPoint: event 
      };
      
      segments.push(currentSegment);
      continue;
    }
    
    currentSegment.events.push(event);
  }

  return segments;
}
