/*
ERA RENDERER
Dumb SVG renderer for era bands and labels.
Uses OLD CSS classes for styling. No inline styles.
Labels are centered horizontally with data-id for click interaction.
*/

export class EraRenderer {
  constructor(viewport, parentGroup) {
    this.viewport = viewport;
    this.group = this._createEraGroup(parentGroup);
  }

  /**
   * Renders era bands from a pre-calculated manifest.
   * Each era in the manifest has: { id, name, startX, width, color, endAge }
   */
  render(eras, height) {
    if (!this.group || !eras) return;
    this.group.innerHTML = '';

    eras.forEach(era => {
        const eraRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        eraRect.setAttribute('x', era.startX);
        eraRect.setAttribute('y', 0);
        eraRect.setAttribute('width', era.width);
        eraRect.setAttribute('height', height);
        eraRect.setAttribute('class', 'graph-era-column');
        if (era.color) {
            eraRect.style.fill = era.color;
        }
        this.group.appendChild(eraRect);

        // Label: centered in the era column, with data-id for click interaction
        if (era.name && era.width > 30) {
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', era.startX + (era.width / 2));
            label.setAttribute('y', 15);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('class', 'graph-era-label');
            label.setAttribute('data-id', era.id);
            label.textContent = era.name;
            this.group.appendChild(label);
        }
    });
  }

  _createEraGroup(parent) {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-eras');
    parent.appendChild(g);
    return g;
  }
}