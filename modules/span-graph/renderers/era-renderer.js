/**
 * DUMB RENDERER: ERA RENDERER
 * Performs pure SVG drawing of background era bands.
 */
export class EraRenderer {
  constructor(viewport, parentGroup) {
    this.viewport = viewport;
    this.group = this._createEraGroup(parentGroup);
  }

  /**
   * Renders era bands from a pre-calculated manifest.
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
        eraRect.setAttribute('class', 'span-graph-era-band');
        eraRect.style.fill = era.color || 'rgba(255, 255, 255, 0.03)';
        eraRect.style.pointerEvents = 'none';
        this.group.appendChild(eraRect);

        // Label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', era.startX + 10);
        label.setAttribute('y', 20);
        label.setAttribute('class', 'span-graph-era-label');
        label.textContent = era.name;
        label.style.fill = era.color || '#fff';
        label.style.opacity = '0.4';
        label.style.fontSize = '12px';
        label.style.fontWeight = 'bold';
        label.style.fontFamily = 'monospace';
        this.group.appendChild(label);
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
