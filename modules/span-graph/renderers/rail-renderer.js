/**
 * Renders the 1:1 diagonal rail segments for a character's history.
 */
export class RailRenderer {
  /**
   * @param {SpanGraphViewport} viewport - The viewport context.
   */
  constructor(viewport) {
    this.viewport = viewport;
  }

  /**
   * Renders the rail paths based on the provided segments.
   * @param {Array} segments - Array of temporal segments.
   */
  render(segments) {
    if (!segments || segments.length === 0) return;

    // Clear existing rail paths if necessary
    // (This will be more robust in future iterations)

    for (const segment of segments) {
      if (segment.events.length < 2) continue;

      const pathData = this._generatePathData(segment);
      this._createPathElement(pathData);
    }
  }

  /**
   * Generates SVG path 'd' attribute for a segment.
   * @private
   */
  _generatePathData(segment) {
    const points = segment.events.map(event => 
      this.viewport.worldToScreen(event.age, event.time)
    );

    const start = points[0];
    const path = [`M ${start.x} ${start.y}`];

    for (let i = 1; i < points.length; i++) {
      path.push(`L ${points[i].x} ${points[i].y}`);
    }

    return path.join(' ');
  }

  /**
   * Creates and appends the SVG path element.
   * @private
   */
  _createPathElement(d) {
    if (typeof document === 'undefined') return;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'span-graph-rail');
    path.style.fill = 'none';
    path.style.stroke = 'var(--continuum-rail-color, #888)';
    path.style.strokeWidth = '2';

    if (this.viewport.svg) {
      this.viewport.svg.appendChild(path);
    }
  }
}
