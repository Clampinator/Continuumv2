import { calculateSegments } from './calculate-segments.js';
import { resolveCoordinates } from './resolve-coordinates.js';
import { generateExperiences } from '../lifeline/services/segment-generator/generate-experiences.js';

/**
 * AUTHORITATIVE TEMPORAL STATE ENGINE
 * Processes character history into physical render nodes.
 * ENFORCES: Singular Identity (No overlapping nodes).
 */
export function getTemporalState(history, subjectiveNow = 0, originTime = 0, actor = null) {
  const segments = calculateSegments(history, originTime);
  
  if (segments.length === 0) {
    const birthNode = { id: 'birth', x: 0, y: originTime, record: { title: "Birth" }, isBirth: true };
    return _finalizeState([{ startX: 0, startY: originTime, nodes: [], arrivalNode: birthNode }], [birthNode], subjectiveNow, 0, actor);
  }

  let totalDisplacement = 0;

  // 1. PHYSICAL PROJECTION
  const nodesWithProjection = history.map(node => {
    let activeSegment = segments.find(s => s.exitPoint?.id === node.id);
    if (!activeSegment) {
        activeSegment = segments.find(s => s.nodes.some(n => n.id === node.id)) || segments[0];
    }
    
    const authoritativeX = Number(node.x);
    const authoritativeY = node.id === 'now' ? node.y : resolveCoordinates(authoritativeX, activeSegment);
    
    const isSpan = Boolean(node.record?.isSpan);
    const arrivalY = isSpan ? Number(node.arrivalY || node.y) : 0;

    if (isSpan) totalDisplacement += Math.abs(arrivalY - authoritativeY);

    return {
      ...node, x: authoritativeX, y: authoritativeY, arrivalY,
      isSpanOrigin: isSpan,
      spanDirection: isSpan ? (arrivalY > authoritativeY ? 'up' : 'down') : null
    };
  });

  // 2. SEGMENT ANCHORING
  const projectedSegments = [];
  for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      let arrivalDirection = null;
      if (i > 0) {
          const prevExitNode = nodesWithProjection.find(n => n.id === segments[i-1].exitPoint?.id);
          arrivalDirection = prevExitNode?.spanDirection;
      }

      const arrivalNode = {
          id: `arrival-${seg.startX}-${seg.startY}`,
          x: Number(seg.startX),
          y: Number(seg.startY),
          record: { title: i === 0 ? "Birth" : "Arrival" },
          isVirtual: true,
          isSpanDest: i > 0,
          isBirth: i === 0,
          spanDirection: arrivalDirection
      };

      projectedSegments.push({
          ...seg, arrivalNode,
          nodes: seg.nodes.map(sn => nodesWithProjection.find(np => np.id === sn.id))
      });
  }

  // 3. COLLATING NODES (The Singular Identity Rule)
  const allRenderNodes = [...nodesWithProjection];
  projectedSegments.forEach(seg => {
      // Check for exact physical overlap with 100ms tolerance
      const existing = allRenderNodes.find(n => 
          Math.abs(n.x - seg.arrivalNode.x) < 0.1 && 
          Math.abs(n.y - seg.arrivalNode.y) < 100
      );

      if (!existing) {
          allRenderNodes.push(seg.arrivalNode);
      } else {
          // Handshake: If nodes overlap, the Virtual Anchor must imbue the 
          // Physical node with its visual properties (Birth or Semicircle).
          if (seg.arrivalNode.isBirth) existing.isBirth = true;
          if (seg.arrivalNode.isSpanDest) {
              existing.isSpanDest = true;
              existing.spanDirection = seg.arrivalNode.spanDirection;
          }
      }
  });

  return _finalizeState(projectedSegments, allRenderNodes, subjectiveNow, totalDisplacement, actor);
}

function _finalizeState(segments, nodes, subjectiveNow, totalDisplacement = 0, actor = null) {
  const nowNode = nodes.find(n => n.id === 'now');
  let experiences = [];
  if (actor) {
      const erasWithIds = Object.entries(actor.system.eras || {}).map(([id, era]) => ({ ...era, id: id }))
          .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
      experiences = generateExperiences(erasWithIds, nodes, nowNode);
  }
  return { segments, nodes, nowNode, experiences, spanPool: { consumed: totalDisplacement, total: 0 } };
}
