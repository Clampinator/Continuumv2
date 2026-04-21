/**
 * Renders the 1:1 diagonal rail segments for a character's history.
 * Optimized for high-volume lifelines.
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
   * Renders the rail paths based on the provided segments.
   * @param {Array} segments - Array of temporal segments.
   */
  render(state) {
    if (!this.group || !state.segments) return;

    // AUTHORITY: Clear existing rails before re-rendering
    this.group.innerHTML = '';

    const fragment = typeof document !== 'undefined' ? document.createDocumentFragment() : null;

    for (const segment of state.segments) {
      if (!segment.events || segment.events.length < 2) continue;

      const pathData = this._generatePathData(segment);
      const pathElement = this._createPathElement(pathData);
      
      if (fragment && pathElement) {
        fragment.appendChild(pathElement);
      } else if (pathElement) {
        this.group.appendChild(pathElement);
      }
    }

    if (fragment) {
      this.group.appendChild(fragment);
    }
  }

  /**
   * Generates SVG path 'd' attribute for a segment.
   * @private
   */
  _generatePathData(segment) {
    const points = segment.events.map(event => {
      // Use the engine-calculated projectedTime
      const time = event.projectedTime ?? 0;
      const age = event.age ?? 0;
      return this.viewport.worldToScreen(age, time);
    });

    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`);
    return d.join(' ');
  }

  /**
   * Creates the SVG path element.
   * @private
   */
  _createPathElement(d) {
    if (typeof document === 'undefined') return null;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'span-graph-rail');
    path.style.fill = 'none';
    path.style.stroke = 'var(--continuum-rail-color, #888)';
    path.style.strokeWidth = '2';
    path.style.pointerEvents = 'none'; // Rails don't block clicks

    return path;
  }

  /**
   * Creates the SVG group for rails.
   * @private
   */
  _createRailGroup() {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-rails');
    return g;
  }
}
