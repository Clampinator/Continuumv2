import { TARGET_RATIO } from './constants.js';

/**
 * CALCULATE SEGMENTS (Physical Character Journey)
 * ADI REBUILT: Uses isolated x (age) and y (ts) coordinates.
 * 
 * @param {Array} nodes - Array of RenderNodes from flattenEvents.
 * @param {number} originTime - Actor's DoB timestamp (ms).
 * @returns {Array} Array of segments.
 */
export function calculateSegments(nodes, originTime) {
  const segments = [];
  
  let currentStartX = 0;
  let currentStartY = originTime;
  let currentNodes = [];

  // Filter for real historical events
  const history = nodes.filter(n => !n.isVirtual && !n.isNow && !n.isBirth);

  for (let i = 0; i < history.length; i++) {
    const node = history[i];
    
    if (node.record.isSpan) {
        // AUTHORITY: A Span ends the current segment
        const exitPoint = {
            id: node.id,
            x: Number(node.x),
            y: Number(node.y),
            record: node.record
        };

        segments.push({
            startX: currentStartX,
            startY: currentStartY,
            nodes: [...currentNodes],
            exitPoint: exitPoint
        });

        // Start a new segment at the Span's arrival
        currentStartX = Number(node.x);
        currentStartY = Number(node.arrivalY || node.y);
        currentNodes = [];
    } else {
        currentNodes.push(node);
    }
  }

  segments.push({
      startX: currentStartX,
      startY: currentStartY,
      nodes: currentNodes,
      exitPoint: null
  });

  return segments;
}
