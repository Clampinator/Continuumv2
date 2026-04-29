import { MS_PER_SECOND } from '/systems/continuum-v2/modules/temporal-engine/constants.js';
import { calculateGridStep } from '/systems/continuum-v2/modules/temporal-engine/projection.js';

/**
 * DUMB RENDERER: GRID RENDERER
 * Performs pure SVG drawing of the background grid.
 */
export class GridRenderer {
  constructor(viewport, parentGroup) {
    this.viewport = viewport;
    this.group = this._createGridGroup(parentGroup);
  }

  render(viewState) {
    if (!this.group) return;
    this.group.innerHTML = '';

    const rect = this.viewport.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // 1. AGE GRID (Vertical)
    const worldLeft = this.viewport.screenToWorld(0, 0).eventAge;
    const worldRight = this.viewport.screenToWorld(width, 0).eventAge;
    const ageStep = calculateGridStep(viewState.zoom);
    const startAge = Math.floor(worldLeft / ageStep) * ageStep;

    for (let age = startAge; age <= worldRight; age += ageStep) {
        const screenX = this.viewport.worldToScreen(age, 0).x;
        const line = this._createLine(screenX, 0, screenX, height, 'grid-line-age');
        this.group.appendChild(line);
    }

    // 2. TIME GRID (Horizontal)
    const worldTop = this.viewport.screenToWorld(0, 0).eventTime;
    const worldBottom = this.viewport.screenToWorld(0, height).eventTime;
    const timeStep = ageStep * MS_PER_SECOND;
    const startTs = Math.floor(Math.min(worldTop, worldBottom) / timeStep) * timeStep;
    const endTs = Math.max(worldTop, worldBottom);

    for (let ts = startTs; ts <= endTs; ts += timeStep) {
        const screenY = this.viewport.worldToScreen(0, ts).y;
        const line = this._createLine(0, screenY, width, screenY, 'grid-line-time');
        this.group.appendChild(line);
    }
  }

  _createLine(x1, y1, x2, y2, className) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('class', className);
    return line;
  }

  _createGridGroup(parent) {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'graph-grid-lines');
    parent.appendChild(g);
    return g;
  }
}
