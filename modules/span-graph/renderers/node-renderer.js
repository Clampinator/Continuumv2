/**
 * DUMB RENDERER: NODE RENDERER
 * Performs pure SVG drawing of node shapes at specified coordinates.
 * REBUILT: High-precision defensive layout pass.
 */
export class NodeRenderer {
  constructor(viewport, parentGroup) {
    this.viewport = viewport;
    this.group = this._createNodeGroup(parentGroup);
  }

  /**
   * Renders nodes from a pre-calculated manifest.
   * 
   * @param {Object} manifest - The RenderManifest.
   */
  render(manifest) {
    if (!this.group || !manifest.nodes) return;
    this.group.innerHTML = '';

    const deferred = [];
    manifest.nodes.forEach(node => {
      // DEFENSIVE: Skip nodes with invalid or missing screen coordinates
      if (node.x === undefined || node.y === undefined || isNaN(node.x) || isNaN(node.y)) {
          console.warn(`SpanGraph | NodeRenderer: Invalid coordinates for node ${node.id}`, node);
          return;
      }

      const el = this._createNodeShape(node);
      if (!el) return;
      // Span-origin triangles render last so they sit on top of any overlapping nodes
      if (el._renderLast) deferred.push(el);
      else this.group.appendChild(el);
    });
    deferred.forEach(el => this.group.appendChild(el));
  }

  /**
   * Renders a temporary "ghost" node at a potential insertion point.
   */
  renderGhostNode(screenPos) {
      if (!this.group) return;
      const existing = this.group.querySelector('.graph-node-ghost');
      if (existing) existing.remove();
      
      // DEFENSIVE
      if (!screenPos || screenPos.x === undefined || screenPos.y === undefined || isNaN(screenPos.x) || isNaN(screenPos.y)) {
          return;
      }

      const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ghost.setAttribute('cx', screenPos.x);
      ghost.setAttribute('cy', screenPos.y);
      ghost.setAttribute('r', '6');
      ghost.setAttribute('class', 'graph-node-ghost');
      
      ghost.style.fill = 'rgba(255, 255, 255, 0.3)';
      ghost.style.stroke = '#fff';
      ghost.style.strokeWidth = '1';
      ghost.style.strokeDasharray = '2, 1';
      ghost.style.pointerEvents = 'none';

      this.group.appendChild(ghost);
  }

  _createNodeShape(node) {
    if (typeof document === 'undefined') return null;

    let shape;
    const cx = node.x;
    const cy = node.y;

    if (node.type === 'span-origin') {
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const r = 9;
        const points = node.spanDirection === 'up'
            ? `${cx},${cy - r} ${cx - r},${cy + r} ${cx + r},${cy + r}`
            : `${cx},${cy + r} ${cx - r},${cy - r} ${cx + r},${cy - r}`;
        shape.setAttribute('points', points);
        shape.classList.add('graph-node-span-origin');
        shape.style.fill = '#ff00ff'; // Unified Span Pink
        shape.style.stroke = '#ffffff';
        shape.style.strokeWidth = '1.5';
        // Render above all other nodes by using a high z-index equivalent via DOM order
        shape._renderLast = true;
    }
    else if (node.type === 'span-dest') {
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const r = 6;
        let pathData;

        // Rule: Flat part down for up spans, flat part up for down spans.
        // Visually: Up span arc points "Up" (lower Y), Down span arc points "Down" (higher Y).
        if (node.spanDirection === 'up') {
            // Flat at bottom, arc points up
            pathData = `M ${cx - r} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx - r} ${cy} Z`;
        } else {
            // Flat at top, arc points down
            pathData = `M ${cx - r} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx - r} ${cy} Z`;
        }
        shape.setAttribute('d', pathData);
        shape.classList.add('graph-node-span-dest');
        shape.style.fill = '#ff00ff';
        shape.style.stroke = '#fff';
    }

    else {
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        shape.setAttribute('cx', cx);
        shape.setAttribute('cy', cy);
        shape.setAttribute('r', node.type === 'now' ? '7' : '5');
        
        if (node.type === 'now') {
            shape.classList.add('graph-node-now');
            shape.style.fill = '#ffff00'; // Pure Yellow
            shape.style.stroke = '#ffffff';
            shape.style.strokeWidth = '1.5';
        }
        else if (node.type === 'birth') shape.classList.add('graph-node-birth');
        else shape.classList.add('graph-node-level');
    }

    shape.dataset.eventId = node.id;
    shape.style.cursor = 'pointer';
    shape.style.pointerEvents = 'auto';

    // Preview nodes (virtual inserted span) get dashed outline
    if (node.isPreview) {
        shape.style.strokeDasharray = '3, 2';
        shape.style.opacity = '0.85';
    }

    return shape;
  }

  _createNodeGroup(parent) {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-nodes');
    parent.appendChild(g);
    return g;
  }
}
