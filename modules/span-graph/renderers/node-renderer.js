/**
 * Renders interactive nodes (Events, Spans, and NOW) for the Span Graph.
 * REBUILT: Atomic, stateless rendering for absolute visual consistency.
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
   * GUARANTEE: Historical events are ALWAYS rendered end-to-end.
   */
  render(state, viewState) {
    if (!this.group) return;
    
    // Clear the group but keep the ghost node if it exists
    const ghostNode = this.group.querySelector('.graph-node-ghost');
    this.group.innerHTML = '';
    if (ghostNode) this.group.appendChild(ghostNode);

    // 1. Render History Events
    if (state.events) {
      state.events.forEach(event => {
        const screenPos = this.viewport.worldToScreen(event.age || 0, event.projectedTime || 0);
        const node = this._createNodeElement(event, screenPos);
        if (node) this.group.appendChild(node);
      });
    }

    // 2. Render NOW node (The big yellow indicator)
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
   * Renders a temporary "ghost" node at a potential insertion point.
   */
  renderGhostNode(worldPos) {
      if (!this.group) return;
      
      const existing = this.group.querySelector('.graph-node-ghost');
      if (existing) existing.remove();

      if (!worldPos) return;

      const screenPos = this.viewport.worldToScreen(worldPos.age, worldPos.time);
      const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ghost.setAttribute('cx', screenPos.x);
      ghost.setAttribute('cy', screenPos.y);
      ghost.setAttribute('r', '6');
      ghost.setAttribute('class', 'graph-node-ghost');
      
      ghost.style.fill = 'rgba(255, 255, 255, 0.3)';
      ghost.style.stroke = '#fff';
      ghost.style.strokeWidth = '1';
      ghost.style.strokeDasharray = '2, 1';
      ghost.style.cursor = 'pointer';
      ghost.style.pointerEvents = 'auto';

      this.group.appendChild(ghost);
      return ghost;
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
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const r = 5;
        const points = event.spanDirection === 'up'
            ? `${cx},${cy - r} ${cx - r},${cy + r} ${cx + r},${cy + r}`
            : `${cx},${cy + r} ${cx - r},${cy - r} ${cx + r},${cy - r}`;
        shape.setAttribute('points', points);
        shape.classList.add('graph-node-span-origin');
    } 
    else if (event.isSpanDest) {
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const r = 4;
        const sweep = event.spanDirection === 'down' ? 0 : 1;
        shape.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 0 ${sweep} ${cx + r} ${cy} Z`);
        shape.classList.add('graph-node-span-dest');
    }
    else {
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
