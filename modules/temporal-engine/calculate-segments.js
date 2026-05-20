/**
 * CALCULATE SEGMENTS (Physical Character Journey)
 * Breaks history into discrete segments.
 * ENFORCES: Physical origin at Birth (Age 0).
 */
export function calculateSegments(history, originTime) {
  const segments = [];
  
  // 1. Sort by Narrative Order
  const nodes = [...history].sort((a, b) => (a.sort || 0) - (b.sort || 0))
                             .filter(n => !n.isVirtual && !n.isBirth);

  // RULE: THE FIRST BREATH
  // The character's physical journey ALWAYS begins at Age 0 and the Date of Birth.
  let currentStartX = 0;
  let currentStartY = originTime;
  let currentNodes = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.id === 'now') continue;

    const eventIsSpan = Boolean(node.record?.eventIsSpan || node.isSpanOrigin);

    if (eventIsSpan) {
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

  // 2. THE FINAL SEGMENT: Ends at the yellow dot.
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
