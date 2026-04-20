import { SECONDS_IN_YEAR, SECONDS_IN_DAY } from '../../temporal-engine/constants.js';

/**
 * Renders an adaptive background grid for the Span Graph.
 */
export class GridRenderer {
  /**
   * @param {SpanGraphViewport} viewport - The viewport context.
   */
  constructor(viewport) {
    this.viewport = viewport;
    this.group = this._createGridGroup();
    
    if (this.viewport.svg && this.group) {
      this.viewport.svg.prepend(this.group);
    }
  }

  /**
   * Updates the grid based on current view state.
   */
  render() {
    if (!this.group || typeof document === 'undefined') return;

    // Clear existing grid lines
    this.group.innerHTML = '';

    const interval = this.getInterval(this.viewport.viewState.zoom);
    const container = this.viewport.container;
    const width = container.clientWidth || 0;
    
    // Determine the visible range in world units (Age)
    const leftWorld = this.viewport.screenToWorld(0, 0).age;
    const rightWorld = this.viewport.screenToWorld(width, 0).age;
    
    // Align start point to interval
    const startAge = Math.floor(leftWorld / interval) * interval;
    
    for (let age = startAge; age <= rightWorld; age += interval) {
      const screenX = this.viewport.worldToScreen(age, 0).x;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', screenX);
      line.setAttribute('y1', '0');
      line.setAttribute('x2', screenX);
      line.setAttribute('y2', '100%');
      line.style.stroke = 'rgba(255, 255, 255, 0.1)';
      line.style.strokeWidth = '1';
      this.group.appendChild(line);
    }
  }

  /**
   * Determines the grid interval (in world units) based on zoom.
   * @param {number} zoom - Current zoom level.
   * @returns {number} Interval in seconds.
   */
  getInterval(zoom) {
    if (zoom > 50) return SECONDS_IN_DAY;
    if (zoom > 10) return SECONDS_IN_DAY * 30; // Monthly-ish
    return SECONDS_IN_YEAR;
  }

  /**
   * Creates the SVG group for the grid.
   * @private
   */
  _createGridGroup() {
    if (typeof document === 'undefined') return null;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-grid');
    return g;
  }
}
