/**
 * Renders the 1:1 diagonal rail segments for a character's history.
 */
export class RailRenderer {
  /**
   * @param {SpanGraphViewport} viewport - The viewport context.
   */
  constructor(viewport) {
    this.viewport = viewport;
    this.group = this._createRailGroup();
    if (this.viewport.svg && this.group) {
      this.viewport.svg.appendChild(this.group);
    }
  }

  /**
   * Renders the rail paths based on the provided state.
   * @param {Object} state - Temporal state.
   */
  render(state) {
    if (!this.group || !state.segments) return;
    this.group.innerHTML = '';

    const fragment = typeof document !== 'undefined' ? document.createDocumentFragment() : null;

    // 1. Render Segment Rails
    for (const segment of state.segments) {
      if (!segment.events || segment.events.length < 2) continue;

      const pathData = this._generatePathData(segment.events);
      const pathElement = this._createPathElement(pathData, 'span-graph-rail');
      
      // AUTHORITY: Standard Leveling is solid blue
      pathElement.style.stroke = 'var(--continuum-rail-color, #00ccff)';
      
      if (fragment) {
        fragment.appendChild(pathElement);
      } else {
        this.group.appendChild(pathElement);
      }
    }

    // 2. Render THE SPANS (Jumps between segments)
    for (let i = 0; i < state.segments.length - 1; i++) {
        const current = state.segments[i];
        const next = state.segments[i + 1];
        
        if (!current.events.length || !next.events.length) continue;

        const lastEvent = current.events[current.events.length - 1];
        const firstEvent = next.events[0];

        // Draw Vertical Span Line
        const pathData = this._generatePathData([lastEvent, firstEvent]);
        const spanLine = this._createPathElement(pathData, 'span-graph-span-line');
        
        // Directional Animation
        const isFuture = firstEvent.projectedTime > lastEvent.projectedTime;
        spanLine.classList.add(isFuture ? 'up' : 'down');

        if (fragment) {
            fragment.appendChild(spanLine);
        } else {
            this.group.appendChild(spanLine);
        }
    }

    // 3. Render THE LOG LINE (trailing from last event to NOW node)
    if (state.events.length > 0 && state.nowNode) {
        const lastEvent = state.events[state.events.length - 1];
        const pathData = this._generatePathData([lastEvent, state.nowNode]);
        const logLine = this._createPathElement(pathData, 'span-graph-log-line');
        
        // Use activeDragType to determine style
        const dragType = this.viewport.viewState.activeDragType;
        if (dragType === 'span') {
            logLine.setAttribute('class', 'span-graph-span-line');
            const isFuture = state.nowNode.projectedTime > lastEvent.projectedTime;
            logLine.classList.add(isFuture ? 'up' : 'down');
        } else {
            logLine.style.stroke = 'var(--continuum-now-color, #00ffff)';
            logLine.style.strokeDasharray = '4, 2';
            logLine.style.opacity = '0.6';
        }
        
        if (fragment) {
            fragment.appendChild(logLine);
        } else {
            this.group.appendChild(logLine);
        }
    }

    if (fragment) {
      this.group.appendChild(fragment);
    }
  }

  _generatePathData(events) {
    const points = events.map(event => {
      const time = event.projectedTime ?? 0;
      const age = event.age ?? 0;
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
    path.style.strokeWidth = '2';
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
