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
   * Renders the strictly controlled path from Birth to NOW, plus any active drag preview.
   */
  render(state, interaction = null) {
    if (!this.group || !state.segments) return;
    this.group.innerHTML = '';

    const fragment = typeof document !== 'undefined' ? document.createDocumentFragment() : null;

    // 1. Trace the Sequence End-to-End through segments
    for (let i = 0; i < state.segments.length; i++) {
        const segment = state.segments[i];

        // A. VERTICAL SPAN (Pink Dots) - PRE-SEGMENT
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
                
                // Animation Direction
                const isFuture = arrivalNode.projectedTime > departureNode.projectedTime;
                spanLine.classList.add(isFuture ? 'up' : 'down');

                if (fragment) fragment.appendChild(spanLine);
                else this.group.appendChild(spanLine);
            }
        }

        // B. LEVELING RAIL (Solid Blue)
        const railNodes = [];
        if (segment.arrivalPoint) railNodes.push(segment.arrivalPoint);
        if (segment.events) railNodes.push(...segment.events);
        if (segment.exitPoint) railNodes.push(segment.exitPoint);

        // If this is the last segment and we are not dragging an established node, add the NOW node
        if (i === state.segments.length - 1 && state.nowNode) {
            // Only add NOW node to the rail if it's not being dragged as a span
            // If dragging, the interaction overlay will handle the tether.
            if (!interaction || !interaction.isDragging) {
                railNodes.push(state.nowNode);
            } else if (interaction.type !== 'node' || !interaction.nodeElement?.classList.contains('graph-node-now')) {
                // If dragging something else (pan, era, or established event), NOW node is static
                railNodes.push(state.nowNode);
            }
        }

        if (railNodes.length >= 2) {
            const points = railNodes.map(node => this.viewport.worldToScreen(node.age, node.projectedTime));
            const pathData = points.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            
            const railLine = this._createPathElement(pathData, 'span-graph-rail');
            if (fragment) fragment.appendChild(railLine);
            else this.group.appendChild(railLine);
        }
    }

    // 2. ACTIVE DRAG PREVIEW OVERLAY
    if (interaction && interaction.isDragging && interaction.type === 'node' && interaction.startWorld && interaction.currentWorld) {
        const startW = interaction.startWorld;
        const currentW = interaction.currentWorld;
        const mode = interaction.mode;

        const p1 = this.viewport.worldToScreen(startW.age, startW.time);
        const p2 = this.viewport.worldToScreen(currentW.age, currentW.time);
        const pathData = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

        if (mode === 'span') {
            const spanLine = this._createPathElement(pathData, 'span-graph-span-line');
            const isFuture = currentW.time > startW.time;
            spanLine.classList.add(isFuture ? 'up' : 'down');
            if (fragment) fragment.appendChild(spanLine);
            else this.group.appendChild(spanLine);
        } else if (mode === 'level') {
            const railLine = this._createPathElement(pathData, 'span-graph-rail');
            if (fragment) fragment.appendChild(railLine);
            else this.group.appendChild(railLine);
        } else {
            const logLine = this._createPathElement(pathData, 'span-graph-log-line');
            if (fragment) fragment.appendChild(logLine);
            else this.group.appendChild(logLine);
        }
    }

    if (fragment) {
      this.group.appendChild(fragment);
    }
  }

  _generatePathData(nodes) {
    const points = nodes.map(node => {
        const time = node.projectedTime ?? node.time ?? 0;
        const age = node.age ?? 0;
        return this.viewport.worldToScreen(age, time);
    });

    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`);
    return d.join(' ');
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
