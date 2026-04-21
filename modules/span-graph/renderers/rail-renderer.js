/**
 * Renders the 1:1 diagonal rail segments for a character's history.
 * AUTHORITY: This version uses forced inline styles to ensure the correct 
 * visual representation of solid blue rails and animated pink dots.
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

    // 1. Trace the Sequential Segments and the Spans between them
    for (let i = 0; i < state.segments.length; i++) {
        const segment = state.segments[i];
        if (!segment.events || segment.events.length === 0) continue;

        // A. Draw the Solid Blue Rail for this segment (LEVELING)
        if (segment.events.length >= 2) {
            const pathData = this._generatePathData(segment.events);
            const pathElement = this._createPathElement(pathData, 'span-graph-rail');
            
            // FORCED INLINE STYLE
            pathElement.style.stroke = '#00e5ff'; // Cyan/Blue
            pathElement.style.strokeWidth = '3';
            pathElement.style.fill = 'none';
            pathElement.style.strokeDasharray = 'none';
            
            if (fragment) fragment.appendChild(pathElement);
            else this.group.appendChild(pathElement);
        }

        // B. Draw the Pink Dot Span between this segment and the next (SPANNING)
        const nextSegment = state.segments[i + 1];
        if (nextSegment && nextSegment.events.length > 0) {
            const lastEvent = segment.events[segment.events.length - 1];
            const firstEvent = nextSegment.events[0];

            const pathData = this._generatePathData([lastEvent, firstEvent]);
            const spanLine = this._createPathElement(pathData, 'span-graph-span-line');
            
            // FORCED INLINE STYLE - PINK DOTS
            spanLine.style.stroke = '#ff00ff';
            spanLine.style.strokeWidth = '4';
            spanLine.style.fill = 'none';
            spanLine.style.strokeDasharray = '0, 12'; // Dots
            spanLine.style.strokeLinecap = 'round';
            
            // Directional Animation (Vertical)
            const isFuture = firstEvent.projectedTime > lastEvent.projectedTime;
            spanLine.classList.add(isFuture ? 'up' : 'down');

            if (fragment) fragment.appendChild(spanLine);
            else this.group.appendChild(spanLine);
        }
    }

    // 2. Render THE LOG LINE (Tether to NOW node)
    if (state.events.length > 0 && state.nowNode) {
        const lastEvent = state.events[state.events.length - 1];
        const pathData = this._generatePathData([lastEvent, state.nowNode]);
        
        const dragType = this.viewport.viewState.activeDragType;
        
        if (dragType === 'span') {
            const logLine = this._createPathElement(pathData, 'span-graph-span-line');
            logLine.style.stroke = '#ff00ff';
            logLine.style.strokeWidth = '4';
            logLine.style.strokeDasharray = '0, 12';
            logLine.style.strokeLinecap = 'round';
            
            const isFuture = state.nowNode.projectedTime > lastEvent.projectedTime;
            logLine.classList.add(isFuture ? 'up' : 'down');
            
            if (fragment) fragment.appendChild(logLine);
            else this.group.appendChild(logLine);
        } else {
            const logLine = this._createPathElement(pathData, 'span-graph-log-line');
            logLine.style.stroke = '#00ffff';
            logLine.style.strokeWidth = '2';
            logLine.style.strokeDasharray = '4, 2';
            logLine.style.opacity = '0.6';
            
            if (fragment) fragment.appendChild(logLine);
            else this.group.appendChild(logLine);
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
