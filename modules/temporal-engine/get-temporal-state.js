import { calculateSegments } from './calculate-segments.js';
import { resolveCoordinates } from './resolve-coordinates.js';
import { generateExperiences } from '../lifeline/services/segment-generator/generate-experiences.js';

/**
 * AUTHORITATIVE TEMPORAL STATE ENGINE
 * ADI REBUILT: Processes RenderNodes through a physically deterministic walk.
 */
export function getTemporalState(history, subjectiveNow = 0, originTime = 0, actor = null) {
  // history: Array of { id, x, y, arrivalY, record, sort, ... }
  const segments = calculateSegments(history, originTime);
  
  if (segments.length === 0) {
    const birthNode = { 
        id: 'birth',
        x: 0, 
        y: originTime, 
        record: { title: "Birth" },
        isBirth: true 
    };
    return _finalizeState([{ startX: 0, startY: originTime, nodes: [], arrivalNode: birthNode }], [birthNode], subjectiveNow, 0, actor);
  }

  let totalDisplacement = 0;

  // 1. PROJECT NODES
  const nodesWithProjection = history.map(node => {
    let activeSegment = segments.find(s => s.exitPoint?.id === node.id);
    if (!activeSegment) {
        activeSegment = segments.find(s => s.nodes.some(n => n.id === node.id)) || segments[0];
    }
    
    // PHYSICS AUTHORITY: Re-resolve Y coordinate to ensure 1:1 diagonal perfection
    const authoritativeX = Number(node.x);
    const authoritativeY = resolveCoordinates(authoritativeX, activeSegment);
    
    const isSpan = !!node.record.isSpan;
    const arrivalY = isSpan ? Number(node.arrivalY || node.y) : 0;

    if (isSpan) {
        totalDisplacement += Math.abs(arrivalY - authoritativeY);
    }

    const spanDirection = isSpan ? (arrivalY > authoritativeY ? 'up' : 'down') : null;

    return {
      ...node,
      x: authoritativeX,
      y: authoritativeY,
      arrivalY,
      isSpanOrigin: isSpan,
      spanDirection: spanDirection
    };
  });

  // 2. PROJECT SEGMENT ANCHORS (Virtual Nodes)
  const projectedSegments = [];
  for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      let exitPoint = null;
      if (seg.exitPoint) {
          exitPoint = nodesWithProjection.find(n => n.id === seg.exitPoint.id);
      }

      let arrivalDirection = null;
      if (i > 0) {
          const prevSeg = projectedSegments[i - 1];
          arrivalDirection = prevSeg?.exitPoint?.spanDirection || 'up';
      }

      const arrivalNode = {
          id: `arrival-${seg.startY}-${i}`,
          x: Number(seg.startX),
          y: Number(seg.startY),
          record: { title: "Arrival" },
          isVirtual: true,
          isSpanDest: seg.startX > 0,
          isBirth: seg.startX === 0,
          spanDirection: arrivalDirection
      };

      projectedSegments.push({
          ...seg,
          arrivalNode,
          exitPoint,
          nodes: seg.nodes.map(sn => nodesWithProjection.find(np => np.id === sn.id))
      });
  }

  // 3. GATHER ALL RENDER NODES
  const allRenderNodes = [...nodesWithProjection];
  projectedSegments.forEach(seg => {
      if (seg.arrivalNode.isSpanDest || seg.arrivalNode.isBirth) {
          if (!allRenderNodes.some(n => n.x === seg.arrivalNode.x && n.y === seg.arrivalNode.y)) {
              allRenderNodes.push(seg.arrivalNode);
          }
      }
  });

  return _finalizeState(projectedSegments, allRenderNodes, subjectiveNow, totalDisplacement, actor);
}

function _finalizeState(segments, nodes, subjectiveNow, totalDisplacement = 0, actor = null) {
  const nowSegment = [...segments].reverse().find(s => s.startX <= subjectiveNow) 
                  || segments[0];

  const nowNode = {
    id: 'now',
    x: subjectiveNow,
    y: resolveCoordinates(subjectiveNow, nowSegment) || 0,
    record: { title: "NOW" },
    isNow: true
  };

  // Ensure Birth is first
  if (!nodes.some(n => n.isBirth)) {
      const birth = segments[0].arrivalNode;
      nodes.unshift({ ...birth, title: "Birth", isBirth: true });
  }

  // Generate experiences using ADI nodes
  let experiences = [];
  if (actor) {
      const erasWithIds = Object.entries(actor.system.eras || {}).map(([id, era]) => ({
          ...era,
          id: id
      })).sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

      experiences = generateExperiences(erasWithIds, nodes, nowNode);
  }

  return { segments, nodes, nowNode, experiences, spanPool: { consumed: totalDisplacement, total: 0 } };
}
