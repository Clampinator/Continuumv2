import { calculateSegments } from './calculate-segments.js';
import { resolveCoordinates } from './resolve-coordinates.js';
import { generateExperiences } from '../lifeline/services/segment-generator/generate-experiences.js';

/**
 * AUTHORITATIVE TEMPORAL STATE ENGINE
 * Enforces the character's journey as a linked sequence of segments and jumps.
 */
export function getTemporalState(history, subjectiveNow = 0, originTime = 0, actor = null) {
  // 1. Generate Physical Segments
  const segments = calculateSegments(history, originTime);
  
  if (segments.length === 0) {
    const defaultArrival = { age: 0, projectedTime: originTime, isBirth: true };
    return _finalizeState([{ startAge: 0, startTime: originTime, events: [], arrivalPoint: defaultArrival }], [], subjectiveNow, 0, actor);
  }

  let totalDisplacement = 0;

  // 2. Project Events into their segments
  const eventsWithProjection = history.map(event => {
    // Find the segment where this event is the EXIT point (Span departure)
    // or where it definitely resides as a normal event.
    let activeSegment = segments.find(s => s.exitPoint?.id === event.id);
    if (!activeSegment) {
        activeSegment = segments.find(s => s.events.some(e => e.id === event.id)) || segments[0];
    }
    
    const projectedTime = resolveCoordinates(event.age, activeSegment);
    const arrivalTime = event.isSpan ? Number(event.arrivalTime || event.time) : 0;

    if (event.isSpan) {
        totalDisplacement += Math.abs(arrivalTime - projectedTime);
    }

    return {
      ...event,
      projectedTime,
      arrivalTime,
      // Visual Flags
      isSpanOrigin: !!event.isSpan,
      spanDirection: event.isSpan ? (arrivalTime > projectedTime ? 'up' : 'down') : null
    };
  });

  // 3. Project Segment Anchors (The Wormhole Links)
  const projectedSegments = segments.map((seg, index) => {
      // EXIT (Departure): The end of this rail segment
      let exitPoint = null;
      if (seg.exitPoint) {
          const rawExit = eventsWithProjection.find(e => e.id === seg.exitPoint.id);
          exitPoint = {
              id: rawExit.id,
              age: Number(rawExit.age),
              projectedTime: Number(rawExit.projectedTime),
              isSpanOrigin: true,
              spanDirection: rawExit.spanDirection
          };
      }

      // ARRIVAL: The start of this rail segment
      // Direction is determined by looking at the Span event that created this segment
      let arrivalDirection = null;
      if (index > 0) {
          const prevSeg = segments[index - 1];
          const spanEvent = eventsWithProjection.find(e => e.id === prevSeg.exitPoint?.id);
          arrivalDirection = spanEvent?.spanDirection || 'up';
      }

      const arrivalPoint = {
          id: `arrival-${seg.startTime}-${index}`,
          age: Number(seg.startAge),
          projectedTime: Number(seg.startTime),
          isVirtual: true,
          isSpanDest: seg.startAge > 0,
          isBirth: seg.startAge === 0,
          spanDirection: arrivalDirection
      };

      return {
          ...seg,
          arrivalPoint,
          exitPoint,
          events: seg.events.map(e => eventsWithProjection.find(ep => ep.id === e.id))
      };
  });

  return _finalizeState(projectedSegments, eventsWithProjection, subjectiveNow, totalDisplacement, actor);
  }

  function _finalizeState(segments, events, subjectiveNow, totalDisplacement = 0, actor = null) {
  const nowSegment = [...segments].reverse().find(s => s.startAge <= subjectiveNow) 
                  || segments[0];

  const nowNode = {
    id: 'now',
    age: subjectiveNow,
    projectedTime: resolveCoordinates(subjectiveNow, nowSegment) || 0,
    isNow: true
  };

  // Ensure Birth node exists at Age 0
  if (!events.some(e => Number(e.age) === 0)) {
      const birth = segments[0].arrivalPoint;
      events.unshift({ ...birth, title: "Birth", isBirth: true });
  }

  // 4. Generate Experience Boxes if actor is provided
  let experiences = [];
  if (actor) {
      const rawEras = actor.system.eras || {};
      const sortedEras = Object.values(rawEras).sort((a,b) => (a.sort || 0) - (b.sort || 0));
      experiences = generateExperiences(sortedEras, events, nowNode);
  }

  return { segments, events, nowNode, experiences, spanPool: { consumed: totalDisplacement, total: 0 } };
  }
