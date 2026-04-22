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

  // 1. PROJECT EVENTS
  const eventsWithProjection = history.map((event, index) => {
    const activeSegment = [...segments].reverse().find(s => s.startAge <= event.age) 
                       || segments[0];
    
    const projectedTime = resolveCoordinates(event.age, activeSegment);
    
    // AUTHORITY: Tag Span Origins and Destinations
    let isSpanOrigin = false;
    let isSpanDest = false;
    let spanType = null;

    if (event.isSpan) {
       isSpanOrigin = true;
       const segmentIndex = segments.indexOf(activeSegment);
       const previousSegment = segments[segmentIndex - 1] || activeSegment;
       const departureTime = resolveCoordinates(event.age, previousSegment) || 0;
       const arrivalTime = event.arrivalTime || 0;
       totalDisplacement += Math.abs(arrivalTime - departureTime);
       
       spanType = arrivalTime > departureTime ? 'up' : 'down';
    }

    // A destination is any node that starts a segment (except the very first segment)
    const isFirstOfSegment = segments.some(s => s.events[0]?.id === event.id && s !== segments[0]);
    if (isFirstOfSegment) {
        isSpanDest = true;
        // Determine arrival direction by looking at the previous span event
        const prevEvent = history[index - 1];
        if (prevEvent && prevEvent.isSpan) {
            spanType = (event.projectedTime > (prevEvent.arrivalTime || 0) ? 'up' : 'down');
            // Wait, the arrival time IS the projected time of the first node of the segment.
            // Let's use the Span event's arrivalTime to determine direction.
            const arrivalTime = prevEvent.arrivalTime || 0;
            const departureSegment = segments.find(s => s.events.includes(prevEvent));
            const departureTime = resolveCoordinates(prevEvent.age, departureSegment);
            spanType = arrivalTime > departureTime ? 'up' : 'down';
        }
    }

    return {
      ...event,
      projectedTime,
      isSpanOrigin,
      isSpanDest,
      spanDirection: spanType
    };
  });

  // 2. PROJECT SEGMENT EVENTS (Crucial for RailRenderer)
  const projectedSegments = segments.map(seg => {
      return {
          ...seg,
          events: seg.events.map(e => eventsWithProjection.find(ep => ep.id === e.id))
      };
  });

  // 3. PROJECT NOW NODE
  const nowSegment = [...segments].reverse().find(s => s.startAge <= subjectiveNow) 
                  || segments[0];
  
  const nowNode = {
    id: 'now',
    age: subjectiveNow,
    projectedTime: nowSegment ? (resolveCoordinates(subjectiveNow, nowSegment) || 0) : 0,
    isNow: true
  };

  return {
    segments: projectedSegments,
    events: eventsWithProjection,
    nowNode,
    spanPool: {
      consumed: totalDisplacement,
      total: 0 
    }
  };
}
