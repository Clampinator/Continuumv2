/**
 * CALCULATE SEGMENTS (Physical Character Journey)
 * Breaks history into discrete segments. 
 * ENFORCES: NOW node is terminal (only in the last segment).
 */
export function calculateSegments(history, originTime) {
  const segments = [];
  
  // 1. Sort by Narrative Order
  const nodes = [...history].sort((a, b) => (a.sort || 0) - (b.sort || 0))
                             .filter(n => !n.isVirtual && !n.isBirth);

  let currentStartX = 0;
  let currentStartY = originTime;
  let currentNodes = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    
    // RULE: The 'now' node must never be an exit point or an intermediate node.
    // It only exists at the very end of the final segment.
    if (node.id === 'now') continue;

    if (node.record?.isSpan) {
        const exitPoint = {
            id: node.id, x: Number(node.x), y: Number(node.y), record: node.record
        };

        segments.push({
            startX: currentStartX, startY: currentStartY,
            nodes: [...currentNodes], exitPoint: exitPoint
        });

        currentStartX = Number(node.x);
        currentStartY = Number(node.arrivalY || node.y);
        currentNodes = [];
    } else {
        currentNodes.push(node);
    }
  }

  // 2. THE FINAL SEGMENT: Terminal nodes only
  const nowNode = history.find(n => n.id === 'now');
  if (nowNode) {
      currentNodes.push(nowNode);
  }

  segments.push({
      startX: currentStartX, startY: currentStartY,
      nodes: currentNodes, exitPoint: null
  });

  return segments;
}
