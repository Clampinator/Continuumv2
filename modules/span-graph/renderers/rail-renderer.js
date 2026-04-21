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
  }

  /**
   * Renders the rail paths based on the provided segments.
   * @param {Array} segments - Array of temporal segments.
   */
  render(segments) {
    if (!segments || segments.length === 0) return;

    // Use a document fragment for batching if many segments exist
    const fragment = typeof document !== 'undefined' ? document.createDocumentFragment() : null;

    for (const segment of segments) {
      if (segment.events.length < 2) continue;

      const pathData = this._generatePathData(segment);
      const pathElement = this._createPathElement(pathData);
      
      if (fragment && pathElement) {
        fragment.appendChild(pathElement);
      } else if (pathElement && this.viewport.svg) {
        this.viewport.svg.appendChild(pathElement);
      }
    }

    if (fragment && this.viewport.svg) {
      this.viewport.svg.appendChild(fragment);
    }
  }

  /**
   * Generates SVG path 'd' attribute for a segment.
   * Optimized to reduce string concatenations.
   * @private
   */
  _generatePathData(segment) {
    const points = segment.events.map(event => {
      // Use the engine-calculated projectedTime, falling back to raw time if necessary.
      const time = event.projectedTime ?? event.time ?? 0;
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

    return path;
  }
}
