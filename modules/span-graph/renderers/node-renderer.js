/**
 * Renders interactive nodes (Events, Spans, and NOW) for the Span Graph.
 * ADI REBUILT: Uses isolated x (age) and y (ts) coordinates.
 */
export class NodeRenderer {
  constructor(viewport, parentGroup) {
    this.viewport = viewport;
    this.group = this._createNodeGroup(parentGroup);
  }

  render(state, viewState, activeNode = null, interaction = null) {
    if (!this.group) return;
    this.group.innerHTML = '';

    // 1. Render History Nodes
    if (state.nodes) {
      state.nodes.forEach(node => {
        const screenPos = this.viewport.worldToScreen(node.x || 0, node.y || 0);
        const el = this._createNodeElement(node, screenPos);
        if (el) this.group.appendChild(el);
      });
    }

    // 2. Render NOW node
    if (state.nowNode) {
        const draggingNow = interaction && interaction.isDragging && interaction.type === 'node' && interaction.nodeElement?.classList.contains('graph-node-now');
        
        if (!draggingNow) {
            const screenPos = this.viewport.worldToScreen(state.nowNode.x || 0, state.nowNode.y || 0);
            const el = this._createNodeElement(state.nowNode, screenPos);
            if (el) {
                el.classList.add('graph-node-now');
                this.group.appendChild(el);
            }
        }
    }

    // 3. Render THE ACTIVE DRAG NODE
    if (interaction && interaction.isDragging && interaction.type === 'node' && interaction.currentWorld) {
        const world = interaction.currentWorld;
        const screenPos = this.viewport.worldToScreen(world.age, world.time);
        
        const eventId = interaction.nodeElement?.dataset.eventId;
        const isNow = interaction.nodeElement?.classList.contains('graph-node-now');
        const sourceNode = isNow ? state.nowNode : state.nodes.find(n => n.id === eventId);
        
        if (sourceNode) {
            const el = this._createNodeElement(sourceNode, screenPos);
            if (el) {
                el.classList.add('dragging');
                if (isNow) el.classList.add('graph-node-now');
                this.group.appendChild(el);
            }
        }
    }
  }

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
      ghost.style.cursor = 'crosshair';
      ghost.style.pointerEvents = 'none';

      this.group.appendChild(ghost);
      return ghost;
  }

  _createNodeElement(node, pos) {
    if (typeof document === 'undefined') return null;

    let shape;
    const cx = pos.x;
    const cy = pos.y;

    if (node.isSpanOrigin) {
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const r = 5;
        const points = node.spanDirection === 'up'
            ? `${cx},${cy - r} ${cx - r},${cy + r} ${cx + r},${cy + r}`
            : `${cx},${cy + r} ${cx - r},${cy - r} ${cx + r},${cy - r}`;
        shape.setAttribute('points', points);
        shape.classList.add('graph-node-span-origin');
    } 
    else if (node.isSpanDest) {
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const r = 5;
        let pathData;
        if (node.spanDirection === 'up') {
            pathData = `M ${cx - r} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx - r} ${cy} Z`;
        } else {
            pathData = `M ${cx + r} ${cy} L ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy} Z`;
        }
        shape.setAttribute('d', pathData);
        shape.classList.add('graph-node-span-dest');
    }
    else {
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        shape.setAttribute('cx', cx);
        shape.setAttribute('cy', cy);
        shape.setAttribute('r', node.isNow ? '8' : '5');
        shape.classList.add(node.isNow ? 'graph-node-now' : 'graph-node-level');
    }

    shape.style.cursor = 'pointer';
    shape.style.pointerEvents = 'auto';
    shape.dataset.eventId = node.id;

    return shape;
  }

  _createNodeGroup(parent) {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-nodes');
    g.style.pointerEvents = 'none'; 
    parent.appendChild(g);
    return g;
  }
}
