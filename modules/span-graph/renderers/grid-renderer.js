import { SECONDS_IN_YEAR, SECONDS_IN_DAY } from '../../temporal-engine/constants.js';
import { formatSubjectiveAge, convertTimestampToDateString } from '../../span-graph-utils/provide-span-graph-utils.js';

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

    // Clear existing grid lines and labels
    this.group.innerHTML = '';

    const { zoom } = this.viewport.viewState;
    const interval = this.getInterval(zoom);
    const container = this.viewport.container;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    
    // 1. VERTICAL GRID LINES (SUBJECTIVE AGE)
    const leftWorld = this.viewport.screenToWorld(0, 0).age;
    const rightWorld = this.viewport.screenToWorld(width, 0).age;
    const startAge = Math.floor(leftWorld / interval) * interval;
    
    for (let age = startAge; age <= rightWorld; age += interval) {
      const screenX = this.viewport.worldToScreen(age, 0).x;
      
      // Line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', screenX);
      line.setAttribute('y1', '0');
      line.setAttribute('x2', screenX);
      line.setAttribute('y2', '100%');
      line.style.stroke = 'rgba(255, 255, 255, 0.15)';
      line.style.strokeWidth = '1';
      this.group.appendChild(line);

      // Label (Anchor at bottom)
      if (zoom > 0.5) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', screenX + 2);
          text.setAttribute('y', height - 15);
          text.style.fill = 'rgba(255, 255, 255, 0.6)';
          text.style.fontSize = '10px';
          text.style.fontFamily = 'monospace';
          text.style.pointerEvents = 'none';
          text.textContent = age === 0 ? 'Birth' : formatSubjectiveAge(age);
          this.group.appendChild(text);
      }
    }

    // 2. HORIZONTAL GRID LINES (OBJECTIVE TIME)
    const timeInterval = interval * 1000; 
    const topWorld = this.viewport.screenToWorld(0, 0).time;
    const bottomWorld = this.viewport.screenToWorld(0, height).time;
    
    const startTime = Math.floor(Math.min(topWorld, bottomWorld) / timeInterval) * timeInterval;
    const endTime = Math.max(topWorld, bottomWorld);

    for (let time = startTime; time <= endTime; time += timeInterval) {
        const screenY = this.viewport.worldToScreen(0, time).y;
        
        // Line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '0');
        line.setAttribute('y1', screenY);
        line.setAttribute('x2', '100%');
        line.setAttribute('y2', screenY);
        line.style.stroke = 'rgba(255, 255, 255, 0.1)';
        line.style.strokeWidth = '1';
        this.group.appendChild(line);

        // Label (Anchor at left)
        if (zoom > 0.5) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', 5);
            text.setAttribute('y', screenY - 4);
            text.style.fill = 'rgba(255, 255, 255, 0.5)';
            text.style.fontSize = '10px';
            text.style.fontFamily = 'monospace';
            text.style.pointerEvents = 'none';
            
            const dt = convertTimestampToDateString(time);
            text.textContent = dt.date;
            this.group.appendChild(text);
        }
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
    if (zoom > 2) return SECONDS_IN_YEAR;
    if (zoom > 0.2) return SECONDS_IN_YEAR * 10;
    return SECONDS_IN_YEAR * 50;
  }

  /**
   * Creates the SVG group for the grid.
   * @private
   */
  _createGridGroup() {
    if (typeof document === 'undefined') return null;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-grid');
    g.style.pointerEvents = 'none'; 
    return g;
  }
}
