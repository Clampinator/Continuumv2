/*
CREATION RENDERER
Dumb SVG renderer for the creation bar and drag rect.
Receives manifest data, draws pixels. No domain logic.
*/

export class CreationRenderer {
  constructor(viewport, parentGroup) {
    this.viewport = viewport;
    this.group = this._createCreationGroup(parentGroup);
  }

  /**
   * Renders the creation bar at the bottom and optional drag rect.
   * @param {number|null} startX - Unused (kept for API compat). Bar is always full-width.
   * @param {Object|null} dragRect - { startX, endX, y, height } for the drag selection.
   */
  render(startX, dragRect = null) {
    if (!this.group) return;
    this.group.innerHTML = '';

    const rect = this.viewport.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const barHeight = 20;

    // Creation bar at the bottom - always full width, always rendered
    const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bar.setAttribute('x', 0);
    bar.setAttribute('y', height - barHeight);
    bar.setAttribute('width', width);
    bar.setAttribute('height', barHeight);
    bar.setAttribute('class', 'creation-bar-era');
    this.group.appendChild(bar);

    // Label centered in the bar
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', width / 2);
    label.setAttribute('y', height - 7);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'creation-label-era');
    label.textContent = 'Create Era';
    this.group.appendChild(label);

    // Drag selection rect - only visible during era creation drag
    if (dragRect) {
      const drag = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      drag.setAttribute('x', dragRect.startX);
      drag.setAttribute('y', dragRect.y);
      drag.setAttribute('width', dragRect.endX - dragRect.startX);
      drag.setAttribute('height', dragRect.height);
      drag.setAttribute('class', 'creation-drag-rect');
      this.group.appendChild(drag);
    }
  }

  _createCreationGroup(parent) {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-creation');
    parent.appendChild(g);
    return g;
  }
}