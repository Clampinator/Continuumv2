/**
 * Renders interactive nodes (Events, Spans, and NOW) for the Span Graph.
 * Matches legacy typography: Triangles for Origins, Semi-circles for Dest.
 */
export class NodeRenderer {
  constructor(viewport) {
    this.viewport = viewport;
    this.group = this._createNodeGroup();
    if (this.viewport.svg && this.group) {
      this.viewport.svg.appendChild(this.group);
    }
  }

  /**
   * Renders all nodes for the current state.
   */
  render(state) {
    if (!this.group) return;
    this.group.innerHTML = '';

    // 1. Render History Events
    if (state.events) {
      for (const event of state.events) {
        const screenPos = this.viewport.worldToScreen(event.age || 0, event.projectedTime || 0);
        const node = this._createNodeElement(event, screenPos);
        if (node) this.group.appendChild(node);
      }
    }

    // 2. Render NOW node
    if (state.nowNode) {
        const screenPos = this.viewport.worldToScreen(state.nowNode.age || 0, state.nowNode.projectedTime || 0);
        const node = this._createNodeElement(state.nowNode, screenPos);
        if (node) {
            node.classList.add('graph-node-now');
            node.setAttribute('r', '8'); 
            this.group.appendChild(node);
        }
    }
  }

  /**
   * Creates an individual node element with correct typography.
   * @private
   */
  _createNodeElement(event, pos) {
    if (typeof document === 'undefined') return null;

    let shape;
    const cx = pos.x;
    const cy = pos.y;

    if (event.isSpanOrigin) {
        // --- PINK TRIANGLE ---
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const r = 5;
        const points = event.spanDirection === 'up'
            ? `${cx},${cy - r} ${cx - r},${cy + r} ${cx + r},${cy + r}`
            : `${cx},${cy + r} ${cx - r},${cy - r} ${cx + r},${cy - r}`;
        shape.setAttribute('points', points);
        shape.classList.add('graph-node-span-origin');
    } 
    else if (event.isSpanDest) {
        // --- PINK SEMI-CIRCLE ---
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const r = 4;
        const sweep = event.spanDirection === 'down' ? 0 : 1;
        shape.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 0 ${sweep} ${cx + r} ${cy} Z`);
        shape.classList.add('graph-node-span-dest');
    }
    else {
        // --- STANDARD CIRCLE (Level or NOW) ---
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        shape.setAttribute('cx', cx);
        shape.setAttribute('cy', cy);
        shape.setAttribute('r', event.isNow ? '8' : '5');
        shape.classList.add(event.isNow ? 'graph-node-now' : 'graph-node-level');
    }

    shape.style.cursor = 'pointer';
    shape.style.pointerEvents = 'auto';
    shape.dataset.eventId = event.id;

    return shape;
  }

  _createNodeGroup() {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-nodes');
    g.style.pointerEvents = 'none'; 
    return g;
  }
}
