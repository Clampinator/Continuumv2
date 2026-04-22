import { calculateSegments } from './calculate-segments.js';
import { resolveCoordinates } from './resolve-coordinates.js';
import { generateExperiences } from '../lifeline/services/segment-generator/generate-experiences.js';

/**
 * AUTHORITATIVE TEMPORAL STATE ENGINE
 * Enforces the character's journey as a linked sequence of segments and jumps.
 * REBUILT: Immutable Physical Authority Pass.
 */
export function getTemporalState(history, subjectiveNow = 0, originTime = 0, actor = null) {
  const segments = calculateSegments(history, originTime);
  
  if (segments.length === 0) {
    const birthNode = { 
        id: 'birth',
        age: 0, 
        projectedTime: originTime, 
        time: originTime, 
        isBirth: true 
    };
    return _finalizeState([{ startAge: 0, startTime: originTime, events: [], arrivalPoint: birthNode }], [], subjectiveNow, 0, actor);
  }

  let totalDisplacement = 0;

  // 1. Project Events
  const eventsWithProjection = history.map(event => {
    let activeSegment = segments.find(s => s.exitPoint?.id === event.id);
    if (!activeSegment) {
        activeSegment = segments.find(s => s.events.some(e => e.id === event.id)) || segments[0];
    }
    
    // AUTHORITY: Absolute high-precision age/time from ground-truth storage
    const authoritativeAge = Number(event.age);
    const projectedTime = resolveCoordinates(authoritativeAge, activeSegment);
    
    const arrivalTime = event.isSpan ? Number(event.arrivalTime || event.time) : 0;

    if (event.isSpan) {
        totalDisplacement += Math.abs(arrivalTime - projectedTime);
    }

    const spanDirection = event.isSpan ? (arrivalTime > projectedTime ? 'up' : 'down') : null;

    return {
      ...event,
      age: authoritativeAge,
      projectedTime,
      time: event.time || projectedTime,
      arrivalTime,
      isSpanOrigin: !!event.isSpan,
      spanDirection: spanDirection
    };
  });

  // 2. Project Segment Anchors
  const projectedSegments = segments.map((seg, index) => {
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
          time: Number(seg.startTime),
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

  if (!events.some(e => Number(e.age) === 0)) {
      const birth = segments[0].arrivalPoint;
      events.unshift({ ...birth, title: "Birth", isBirth: true });
  }

  let experiences = [];
  if (actor) {
      const erasWithIds = Object.entries(actor.system.eras || {}).map(([id, era]) => ({
          ...era,
          id: id
      })).sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

      experiences = generateExperiences(erasWithIds, events, nowNode);
  }

  return { segments, events, nowNode, experiences, spanPool: { consumed: totalDisplacement, total: 0 } };
}
