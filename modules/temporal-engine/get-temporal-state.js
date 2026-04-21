import { calculateSegments } from './calculate-segments.js';
import { resolveCoordinates } from './resolve-coordinates.js';

/**
 * Calculates the unified temporal state for a character's history.
 * 
 * @param {Array} history - Raw array of sorted events.
 * @param {number} [subjectiveNow=0] - The character's current subjective age in seconds.
 * @returns {Object} Unified state object.
 */
export function getTemporalState(history, subjectiveNow = 0) {
  const segments = calculateSegments(history);
  
  if (segments.length === 0 && subjectiveNow === 0) {
    return { segments: [], events: [], spanPool: { consumed: 0, total: 0 }, nowNode: null };
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
       const segmentIndex = segments.indexOf(activeSegment);
       const previousSegment = segments[segmentIndex - 1] || activeSegment;
       const departureTime = resolveCoordinates(event.age, previousSegment) || 0;
       const arrivalTime = event.arrivalTime || 0;
       totalDisplacement += Math.abs(arrivalTime - departureTime);
    }

    return {
      ...event,
      projectedTime
    };
  });

  // Calculate the "NOW" node
  const nowSegment = [...segments].reverse().find(s => s.startAge <= subjectiveNow) 
                  || segments[0];
  
  const nowNode = {
    id: 'now',
    age: subjectiveNow,
    projectedTime: nowSegment ? (resolveCoordinates(subjectiveNow, nowSegment) || 0) : 0,
    isNow: true
  };

  return {
    segments,
    events: eventsWithProjection,
    nowNode,
    spanPool: {
      consumed: totalDisplacement,
      total: 0 // Placeholder for system-calculated total Span
    }
  };
}
