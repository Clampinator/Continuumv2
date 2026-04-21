/**
 * Renders interactive nodes (Events, Spans, and NOW) for the Span Graph.
 */
export class NodeRenderer {
  /**
   * @param {SpanGraphViewport} viewport - The viewport context.
   */
  constructor(viewport) {
    this.viewport = viewport;
    this.group = this._createNodeGroup();
    
    if (this.viewport.svg && this.group) {
      this.viewport.svg.appendChild(this.group);
    }
  }

  /**
   * Renders nodes for the provided events and optional Now node.
   * @param {Array} events - Array of events with projected coordinates.
   * @param {Object} [nowNode] - The current NOW node.
   */
  render(events, nowNode = null) {
    if (!this.group) return;

    // Clear existing nodes
    this.group.innerHTML = '';

    if (events) {
      for (const event of events) {
        const screenPos = this.viewport.worldToScreen(event.age || 0, event.projectedTime || 0);
        const node = this._createNodeElement(event, screenPos);
        if (node) this.group.appendChild(node);
      }
    }

    // Render NOW node
    if (nowNode) {
        const screenPos = this.viewport.worldToScreen(nowNode.age || 0, nowNode.projectedTime || 0);
        const node = this._createNodeElement(nowNode, screenPos);
        if (node) {
            node.classList.add('graph-node-now');
            node.style.fill = 'var(--continuum-now-color, #00ffff)';
            node.style.strokeWidth = '2';
            node.setAttribute('r', '8');
            this.group.appendChild(node);
        }
    }
  }

  /**
   * Creates an individual node element.
   * @private
   */
  _createNodeElement(event, pos) {
    if (typeof document === 'undefined') return null;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', pos.x);
    circle.setAttribute('cy', pos.y);
    circle.setAttribute('r', event.isSpan ? '6' : '4');
    circle.setAttribute('class', event.isSpan ? 'graph-node-span' : 'graph-node-level');
    
    circle.style.fill = event.isSpan ? 'var(--continuum-span-color, #ff00ff)' : 'var(--continuum-node-color, #fff)';
    circle.style.stroke = '#000';
    circle.style.strokeWidth = '1';
    circle.style.cursor = 'pointer';

    // Store data on the element for interaction logic
    circle.dataset.eventId = event.id;

    return circle;
  }

  /**
   * Creates the SVG group for nodes.
   * @private
   */
  _createNodeGroup() {
    if (typeof document === 'undefined') return null;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-nodes');
    return g;
  }
}
