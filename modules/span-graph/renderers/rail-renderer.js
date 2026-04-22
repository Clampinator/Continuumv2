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

        // A. SPAN JUMP (Pink Dots) - Draw from previous segment end to this segment's arrival point
        if (i > 0) {
            const prevSegment = state.segments[i - 1];
            const lastEventOfPrev = prevSegment.events[prevSegment.events.length - 1];
            const arrivalPoint = segment.arrivalPoint;

            if (lastEventOfPrev && arrivalPoint) {
                const pathData = this._generatePathData([lastEventOfPrev, arrivalPoint]);
                const spanLine = this._createPathElement(pathData, 'span-graph-span-line');
                if (fragment) fragment.appendChild(spanLine);
                else this.group.appendChild(spanLine);
            }
        }

        // B. LEVELING SEGMENT (Solid Blue)
        // If there's an arrival point (virtual node), we must connect it to the first actual event
        const segmentPathEvents = [];
        if (segment.arrivalPoint) segmentPathEvents.push(segment.arrivalPoint);
        segmentPathEvents.push(...segment.events);

        if (segmentPathEvents.length >= 2) {
            const pathData = this._generatePathData(segmentPathEvents);
            const pathElement = this._createPathElement(pathData, 'span-graph-rail');
            if (fragment) fragment.appendChild(pathElement);
            else this.group.appendChild(pathElement);
        }
    }

    // 2. ACTIVE LOG TETHER (Trail to NOW node)
    if (state.events.length > 0 && state.nowNode) {
        const lastEvent = state.events[state.events.length - 1];
        const pathData = this._generatePathData([lastEvent, state.nowNode]);
        
        const dragMode = this.viewport._interaction?.mode;
        
        if (dragMode === 'span') {
            const logLine = this._createPathElement(pathData, 'span-graph-span-line');
            if (fragment) fragment.appendChild(logLine);
            else this.group.appendChild(logLine);
        } else if (dragMode === 'level') {
            const logLine = this._createPathElement(pathData, 'span-graph-rail');
            if (fragment) fragment.appendChild(logLine);
            else this.group.appendChild(logLine);
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
