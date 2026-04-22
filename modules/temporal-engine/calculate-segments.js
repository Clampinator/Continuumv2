import { TARGET_RATIO } from './constants.js';

/**
 * CALCULATE SEGMENTS (Physical Character Journey)
 * REBUILT: Only Spans create new segments. Normal events ride on the rails.
 * 
 * @param {Array} events - Sorted array of events from flattenEvents.
 * @param {number} originTime - Actor's DoB timestamp (ms).
 * @returns {Array} Array of segments.
 */
export function calculateSegments(events, originTime) {
  const segments = [];
  
  // Initialize first segment at Birth
  let currentStartAge = 0;
  let currentStartTime = originTime;
  let currentEvents = [];

  // Filter for real historical events (exclude virtual/now)
  const history = events.filter(e => !e.isVirtual && !e.isNow && !e.isBirth);

  for (let i = 0; i < history.length; i++) {
    const event = history[i];
    
    if (event.isSpan) {
        // AUTHORITY: A Span ends the current segment
        const exitPoint = {
            id: event.id,
            age: Number(event.age),
            time: event.time // Original departure time
        };

        segments.push({
            startAge: currentStartAge,
            startTime: currentStartTime,
            events: [...currentEvents],
            exitPoint: exitPoint
        });

        // Start a new segment at the Span's arrival
        currentStartAge = Number(event.age);
        currentStartTime = Number(event.arrivalTime || event.time);
        currentEvents = [];
    } else {
        // Normal event: just keep it in the current segment's bucket
        currentEvents.push(event);
    }
  }

  // Final Segment (from last span/birth to the "infinity" of current history)
  segments.push({
      startAge: currentStartAge,
      startTime: currentStartTime,
      events: currentEvents,
      exitPoint: null
  });

  return segments;
}
