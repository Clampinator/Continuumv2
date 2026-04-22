/**
 * Renders interactive nodes (Events, Spans, and NOW) for the Span Graph.
 * REBUILT: Renders active drag origin shapes and ghost nodes dynamically.
 */
export class NodeRenderer {
  constructor(viewport) {
    this.viewport = viewport;
    this.group = this._createNodeGroup();
    if (this.viewport.svg && this.group) {
      this.viewport.svg.appendChild(this.group);
    }
  }

  render(state, viewState, activeNode = null, interaction = null) {
    if (!this.group) return;
    
    this.group.innerHTML = '';
    if (activeNode) this.group.appendChild(activeNode);

    // 1. Render History Events
    if (state.events) {
      for (const event of state.events) {
        if (activeNode && activeNode.dataset.eventId === event.id) continue;
        
        const screenPos = this.viewport.worldToScreen(event.age || 0, event.projectedTime || 0);
        const node = this._createNodeElement(event, screenPos);
        if (node) this.group.appendChild(node);
      }
    }

    // 2. Render Active Drag Origin (if spanning)
    if (interaction && interaction.isDragging && interaction.mode === 'span' && interaction.startWorld) {
        const startW = interaction.startWorld;
        const currentW = interaction.currentWorld;
        const isFuture = currentW.time > startW.time;

        const screenPos = this.viewport.worldToScreen(startW.age, startW.time);
        
        const dragOriginEvent = {
            id: 'drag-origin',
            isSpanOrigin: true,
            spanDirection: isFuture ? 'up' : 'down'
        };
        const node = this._createNodeElement(dragOriginEvent, screenPos);
        if (node) this.group.appendChild(node);
    }

    // 3. Render NOW node (unless it is being dragged)
    if (state.nowNode) {
        if (activeNode && activeNode.classList.contains('graph-node-now')) {
            // Already appended above
        } else {
            const screenPos = this.viewport.worldToScreen(state.nowNode.age || 0, state.nowNode.projectedTime || 0);
            const node = this._createNodeElement(state.nowNode, screenPos);
            if (node) this.group.appendChild(node);
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
