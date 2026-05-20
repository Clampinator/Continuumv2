import { MS_PER_SECOND, SECONDS_IN_DECADE, SECONDS_IN_CENTURY, SECONDS_IN_MILLENNIUM } from '/systems/continuum-v2/modules/temporal-engine/constants.js';
import { calculateGridStep } from '/systems/continuum-v2/modules/temporal-engine/projection.js';

/*
DUMB RENDERER: GRID RENDERER
Performs pure SVG drawing of the background grid.
Major lines at decade/century/millennium boundaries get heavier opacity.
A line count guard prevents overdraw at extreme zoom levels.
*/

// SAFETY: Maximum lines per axis before we bail out to prevent a solid-white sheet.
const MAX_GRID_LINES = 200;

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

    const ageStep = calculateGridStep(viewState.zoom);
    const timeStep = ageStep * MS_PER_SECOND;

    // 1. AGE GRID (Vertical)
    const worldLeft = this.viewport.screenToWorld(0, 0).eventAge;
    const worldRight = this.viewport.screenToWorld(width, 0).eventAge;
    const startAge = Math.floor(worldLeft / ageStep) * ageStep;

    // Count lines needed before drawing to prevent overdraw
    const ageCount = Math.ceil((worldRight - startAge) / ageStep);
    if (ageCount <= MAX_GRID_LINES) {
      for (let age = startAge; age <= worldRight; age += ageStep) {
        const screenX = this.viewport.worldToScreen(age, 0).x;
        const weight = this._lineWeight(age);
        const line = this._createLine(screenX, 0, screenX, height, `grid-line-age ${weight}`);
        this.group.appendChild(line);
      }
    }

    // 2. TIME GRID (Horizontal)
    const worldTop = this.viewport.screenToWorld(0, 0).eventTime;
    const worldBottom = this.viewport.screenToWorld(0, height).eventTime;
    const startTs = Math.floor(Math.min(worldTop, worldBottom) / timeStep) * timeStep;
    const endTs = Math.max(worldTop, worldBottom);

    const timeCount = Math.ceil((endTs - startTs) / timeStep);
    if (timeCount <= MAX_GRID_LINES) {
      for (let ts = startTs; ts <= endTs; ts += timeStep) {
        const screenY = this.viewport.worldToScreen(0, ts).y;
        // Convert ts (ms) back to age-seconds to check major boundaries
        const ageSeconds = ts / MS_PER_SECOND;
        const weight = this._lineWeight(ageSeconds);
        const line = this._createLine(0, screenY, width, screenY, `grid-line-time ${weight}`);
        this.group.appendChild(line);
      }
    }
  }

  /**
   * Determines the CSS weight class for a grid line based on whether
   * it falls on a major chronological boundary (millennium > century > decade).
   */
  _lineWeight(ageSeconds) {
    if (ageSeconds % SECONDS_IN_MILLENNIUM === 0) return 'grid-major millennium';
    if (ageSeconds % SECONDS_IN_CENTURY === 0) return 'grid-major century';
    if (ageSeconds % SECONDS_IN_DECADE === 0) return 'grid-major decade';
    return 'grid-minor';
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