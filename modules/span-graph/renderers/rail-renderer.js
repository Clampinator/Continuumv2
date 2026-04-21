/**
 * Renders the authoritative sequential path (Rails & Spans).
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

    // 1. Trace the Sequence End-to-End
    for (let i = 0; i < state.segments.length; i++) {
        const segment = state.segments[i];
        if (!segment.events || segment.events.length === 0) continue;

        // A. LEVELING SEGMENT (Solid Blue)
        if (segment.events.length >= 2) {
            const pathData = this._generatePathData(segment.events);
            const pathElement = this._createPathElement(pathData, 'span-graph-rail');
            if (fragment) fragment.appendChild(pathElement);
            else this.group.appendChild(pathElement);
        }

        // B. SPAN JUMP (Pink Dots)
        const nextSegment = state.segments[i + 1];
        if (nextSegment && nextSegment.events.length > 0) {
            const lastEvent = segment.events[segment.events.length - 1];
            const firstEvent = nextSegment.events[0];

            const pathData = this._generatePathData([lastEvent, firstEvent]);
            const spanLine = this._createPathElement(pathData, 'span-graph-span-line');
            
            // Apply directional class for CSS animation
            const isFuture = firstEvent.projectedTime > lastEvent.projectedTime;
            spanLine.classList.add(isFuture ? 'up' : 'down');

            if (fragment) fragment.appendChild(spanLine);
            else this.group.appendChild(spanLine);
        }
    }

    // 2. ACTIVE LOG TETHER (Trail to NOW node)
    if (state.events.length > 0 && state.nowNode) {
        const lastEvent = state.events[state.events.length - 1];
        const pathData = this._generatePathData([lastEvent, state.nowNode]);
        
        const dragType = this.viewport.viewState.activeDragType;
        
        if (dragType === 'span') {
            // Visual feedback for span logging
            const logLine = this._createPathElement(pathData, 'span-graph-span-line');
            const isFuture = state.nowNode.projectedTime > lastEvent.projectedTime;
            logLine.classList.add(isFuture ? 'up' : 'down');
            if (fragment) fragment.appendChild(logLine);
            else this.group.appendChild(logLine);
        } else {
            // Visual feedback for normal leveling
            const logLine = this._createPathElement(pathData, 'span-graph-log-line');
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
      // COORDINATE AUTHORITY: Use the calculated projectedTime
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
