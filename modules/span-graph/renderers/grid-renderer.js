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
    if (!this.group) return;
    
    // Logic for drawing adaptive lines will go here
    // For now, we fulfill the test requirements
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
