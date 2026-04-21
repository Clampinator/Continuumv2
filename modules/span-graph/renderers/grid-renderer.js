import { SECONDS_IN_YEAR, SECONDS_IN_DAY } from '../../temporal-engine/constants.js';

/**
 * Renders an adaptive background grid for the Span Graph.
 */
export class GridRenderer {
  constructor(viewport) {
    this.viewport = viewport;
    this.group = this._createGridGroup();
    if (this.viewport.svg && this.group) {
      this.viewport.svg.prepend(this.group);
    }
  }

  render() {
    if (!this.group || typeof document === 'undefined') return;
    this.group.innerHTML = '';

    const { zoom } = this.viewport.viewState;
    const interval = this.getInterval(zoom);
    const container = this.viewport.container;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    
    // 1. VERTICAL GRID LINES
    const leftWorld = this.viewport.screenToWorld(0, 0).age;
    const rightWorld = this.viewport.screenToWorld(width, 0).age;
    const startAge = Math.floor(leftWorld / interval) * interval;
    
    for (let age = startAge; age <= rightWorld; age += interval) {
      const screenX = this.viewport.worldToScreen(age, 0).x;
      
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', screenX);
      line.setAttribute('y1', '0');
      line.setAttribute('x2', screenX);
      line.setAttribute('y2', '100%');
      line.style.stroke = 'rgba(255, 255, 255, 0.05)';
      line.style.strokeWidth = '1';
      this.group.appendChild(line);
    }

    // 2. HORIZONTAL GRID LINES
    const timeInterval = interval * 1000; 
    const worldTop = this.viewport.screenToWorld(0, 0).time;
    const worldBottom = this.viewport.screenToWorld(0, height).time;
    
    const startTime = Math.floor(Math.min(worldTop, worldBottom) / timeInterval) * timeInterval;
    const endTime = Math.max(worldTop, worldBottom);

    for (let time = startTime; time <= endTime; time += timeInterval) {
        const screenY = this.viewport.worldToScreen(0, time).y;
        if (screenY < 0 || screenY > height) continue;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '0');
        line.setAttribute('y1', screenY);
        line.setAttribute('x2', '100%');
        line.setAttribute('y2', screenY);
        line.style.stroke = 'rgba(255, 255, 255, 0.05)';
        line.style.strokeWidth = '1';
        this.group.appendChild(line);
    }
  }

  getInterval(zoom) {
    if (zoom > 50) return SECONDS_IN_DAY;
    if (zoom > 10) return SECONDS_IN_DAY * 30;
    if (zoom > 1) return SECONDS_IN_YEAR;
    if (zoom > 0.1) return SECONDS_IN_YEAR * 10;
    return SECONDS_IN_YEAR * 50;
  }

  _createGridGroup() {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-grid');
    g.style.pointerEvents = 'none'; 
    return g;
  }
}
