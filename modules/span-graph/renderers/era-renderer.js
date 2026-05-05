/*
 ERA RENDERER
 Dumb SVG renderer for era bands, labels, and vertical separators.
 Each era in the manifest has: { id, name, startAge, endAge, duration,
 color, startX, width }

 Click interaction: Labels carry data-id attributes so the
 Pointer Machine can route clicks to the era edit dialog.
 Clicking an era label centers the viewport on that era's midpoint.

 Trinity compliance: This is a Projector (dumb renderer). It receives
 pre-calculated screen coordinates and domain metadata. It performs no
 domain logic - only SVG drawing.
*/

export class EraRenderer {
  constructor(viewport, parentGroup) {
    this.viewport = viewport;
    this.group = this._createEraGroup(parentGroup);
  }

  /**
   * Renders era bands, labels, and vertical separators from manifest.
   *
   * @param {Array} eras - Array of era objects from the manifest
   * @param {number} height - Total graph height for separator lines
   */
  render(eras, height) {
    if (!this.group || !eras) return;
    this.group.innerHTML = '';

    eras.forEach((era, index) => {
      // 1. Draw era background band
      this._drawBand(era, height);

      // 2. Draw label (centered horizontally, at top of era)
      this._drawLabel(era);

      // 3. Draw vertical separator between this era and the next
      //    (not after the last era - the graph border handles that)
      if (index < eras.length - 1) {
        this._drawSeparator(era, height);
      }
    });
  }

  _drawBand(era, height) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', era.startX);
    rect.setAttribute('y', 0);
    rect.setAttribute('width', era.width);
    rect.setAttribute('height', height);
    rect.setAttribute('class', 'graph-era-column');
    if (era.color) {
      rect.style.fill = era.color;
    } else {
      rect.style.fill = 'rgba(0, 100, 255, 0.1)';
      rect.style.stroke = 'rgba(0, 100, 255, 0.4)';
    }
    this.group.appendChild(rect);
  }

  _drawLabel(era) {
    if (!era.name || era.width < 30) return;

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', era.startX + (era.width / 2));
    label.setAttribute('y', 15);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'graph-era-label');
    label.setAttribute('data-id', era.id);
    label.style.cursor = 'pointer';
    label.textContent = era.name;
    this.group.appendChild(label);
  }

  _drawSeparator(era, height) {
    // Vertical line at the right edge of this era
    const x = era.startX + era.width;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', x);
    line.setAttribute('y2', height);
    line.setAttribute('class', 'graph-era-separator');
    line.style.stroke = 'rgba(255, 255, 255, 0.15)';
    line.style.strokeWidth = '1px';
    this.group.appendChild(line);
  }

  _createEraGroup(parent) {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-eras');
    parent.appendChild(g);
    return g;
  }
}