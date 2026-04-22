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
        const prevEvent = history.find((e, i) => i < index && e.isSpan && segments.find(s => s.events.includes(e)) !== activeSegment);
        if (prevEvent) {
            const departureSegment = segments.find(s => s.events.includes(prevEvent));
            const departureTime = resolveCoordinates(prevEvent.age, departureSegment);
            spanType = prevEvent.arrivalTime > departureTime ? 'up' : 'down';
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
      // Create a virtual arrival node at the start of the segment if it's following a span
      const firstEvent = eventsWithProjection.find(ep => ep.id === seg.events[0]?.id);
      
      return {
          ...seg,
          // We add a virtual arrival point for the RailRenderer to connect to if this is a new segment
          arrivalPoint: {
              age: seg.startAge,
              projectedTime: seg.startTime,
              isVirtual: true
          },
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
