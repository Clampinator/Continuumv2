import { calculateSegments } from './calculate-segments.js';
import { resolveCoordinates } from './resolve-coordinates.js';

/**
 * Calculates the unified temporal state for a character's history.
 * 
 * @param {Array} history - Raw array of sorted events.
 * @returns {Object} Unified state object.
 */
export function getTemporalState(history) {
  const segments = calculateSegments(history);
  
  if (segments.length === 0) {
    return { segments: [], events: [], spanPool: { consumed: 0, total: 0 } };
  }

  let totalDisplacement = 0;

  const eventsWithProjection = history.map(event => {
    // We need to find the segment that contains this age. 
    // Segments are sorted by startAge. 
    // The active segment is the one where startAge <= event.age, closest to the event.
    const activeSegment = [...segments].reverse().find(s => s.startAge <= event.age) 
                       || segments[0];
    
    const projectedTime = resolveCoordinates(event.age, activeSegment);
    
    // Calculate individual displacement if it's a span
    if (event.isSpan) {
       // We need to calculate displacement against the PREVIOUS segment
       // to see how far we jumped relative to where we were.
       const segmentIndex = segments.indexOf(activeSegment);
       const previousSegment = segments[segmentIndex - 1] || activeSegment;
       const departureTime = resolveCoordinates(event.age, previousSegment);
       totalDisplacement += Math.abs(event.arrivalTime - departureTime);
    }

    return {
      ...event,
      projectedTime
    };
  });

  return {
    segments,
    events: eventsWithProjection,
    spanPool: {
      consumed: totalDisplacement,
      total: 0 // Placeholder for system-calculated total Span
    }
  };
}
