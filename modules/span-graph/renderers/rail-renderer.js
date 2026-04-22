/**
 * Renders the authoritative sequential path (Rails & Spans).
 * REBUILT: Strict sequential continuity. Spans are vertical breaks.
 */
export class RailRenderer {
  constructor(viewport) {
    this.viewport = viewport;
    this.group = this._createRailGroup();
    if (this.viewport.svg && this.group) {
      this.viewport.svg.appendChild(this.group);
    }
  }

  /**
   * Renders a strictly continuous path from Birth to NOW.
   */
  render(state) {
    if (!this.group || !state.segments) return;
    this.group.innerHTML = '';

    const fragment = typeof document !== 'undefined' ? document.createDocumentFragment() : null;

    // 1. Trace the Sequence End-to-End through segments
    for (let i = 0; i < state.segments.length; i++) {
        const segment = state.segments[i];

        // A. VERTICAL SPAN (Pink Dots) - PRE-SEGMENT
        // Every segment (except the first) starts with an arrival from the previous exit.
        if (i > 0) {
            const prevSegment = state.segments[i - 1];
            const departureNode = prevSegment.exitPoint;
            const arrivalNode = segment.arrivalPoint;

            if (departureNode && arrivalNode) {
                // PHYSICS: Draw PERFECTLY vertical jump
                const p1 = this.viewport.worldToScreen(departureNode.age, departureNode.projectedTime);
                const p2 = this.viewport.worldToScreen(arrivalNode.age, arrivalNode.projectedTime);
                
                const pathData = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
                const spanLine = this._createPathElement(pathData, 'span-graph-span-line');
                
                if (fragment) fragment.appendChild(spanLine);
                else this.group.appendChild(spanLine);
            }
        }

        // B. LEVELING RAIL (Solid Blue)
        // A rail flows from segment.arrivalPoint -> all events -> segment.exitPoint
        const railNodes = [];
        if (segment.arrivalPoint) railNodes.push(segment.arrivalPoint);
        if (segment.events) railNodes.push(...segment.events);
        if (segment.exitPoint) railNodes.push(segment.exitPoint);

        if (railNodes.length >= 2) {
            const points = railNodes.map(node => this.viewport.worldToScreen(node.age, node.projectedTime));
            const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            
            const railLine = this._createPathElement(pathData, 'span-graph-rail');
            if (fragment) fragment.appendChild(railLine);
            else this.group.appendChild(railLine);
        }
    }

    // 2. ACTIVE LOG TETHER (Trail to NOW node)
    if (state.nowNode) {
        const lastSegment = state.segments[state.segments.length - 1];
        const allLastNodes = [];
        if (lastSegment.arrivalPoint) allLastNodes.push(lastSegment.arrivalPoint);
        if (lastSegment.events) allLastNodes.push(...lastSegment.events);
        if (lastSegment.exitPoint) allLastNodes.push(lastSegment.exitPoint);
        
        const lastNode = allLastNodes[allLastNodes.length - 1];

        if (lastNode) {
            const p1 = this.viewport.worldToScreen(lastNode.age, lastNode.projectedTime);
            const p2 = this.viewport.worldToScreen(state.nowNode.age, state.nowNode.projectedTime);
            const pathData = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

            const dragMode = this.viewport._interaction?.mode;
            if (dragMode === 'span') {
                const logLine = this._createPathElement(pathData, 'span-graph-span-line');
                if (fragment) fragment.appendChild(logLine);
                else this.group.appendChild(logLine);
            } else if (dragMode === 'level') {
                const logLine = this._createPathElement(pathData, 'span-graph-rail');
                if (fragment) fragment.appendChild(logLine);
                else this.group.appendChild(logLine);
            }
        }
    }

    if (fragment) {
      this.group.appendChild(fragment);
    }
  }

  _createPathElement(d, className) {
    if (typeof document === 'undefined') return null;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', className);
    path.style.fill = 'none';
    path.style.pointerEvents = 'none';
    return path;
  }

  _createRailGroup() {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-rails');
    g.style.pointerEvents = 'none';
    return g;
  }
}
