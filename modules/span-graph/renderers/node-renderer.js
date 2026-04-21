/**
 * Renders interactive nodes (Events, Spans, and NOW) for the Span Graph.
 */
export class NodeRenderer {
  constructor(viewport) {
    this.viewport = viewport;
    this.group = this._createNodeGroup();
    if (this.viewport.svg && this.group) {
      this.viewport.svg.appendChild(this.group);
    }
  }

  render(state) {
    if (!this.group) return;
    this.group.innerHTML = '';
    let nodeCount = 0;

    if (state.events) {
      for (const event of state.events) {
        const screenPos = this.viewport.worldToScreen(event.age || 0, event.projectedTime || 0);
        const node = this._createNodeElement(event, screenPos);
        if (node) {
            this.group.appendChild(node);
            nodeCount++;
        }
      }
    }

    if (state.nowNode) {
        const screenPos = this.viewport.worldToScreen(state.nowNode.age || 0, state.nowNode.projectedTime || 0);
        const node = this._createNodeElement(state.nowNode, screenPos);
        if (node) {
            node.classList.add('graph-node-now');
            node.setAttribute('r', '8'); // Slightly larger for NOW
            this.group.appendChild(node);
            nodeCount++;
        }
    }
  }

  _createNodeElement(event, pos) {
    if (typeof document === 'undefined') return null;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', pos.x);
    circle.setAttribute('cy', pos.y);
    circle.setAttribute('r', event.isSpan ? '6' : '5');
    
    // Class handles coloring and glow via CSS
    circle.classList.add(event.isSpan ? 'graph-node-span' : 'graph-node-level');
    if (event.isNow) circle.classList.add('graph-node-now');

    circle.style.cursor = 'pointer';
    circle.style.pointerEvents = 'auto';
    circle.dataset.eventId = event.id;

    return circle;
  }

  _createNodeGroup() {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-nodes');
    g.style.pointerEvents = 'none'; 
    return g;
  }
}
