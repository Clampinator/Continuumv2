/**
 * Renders the persistent Era backgrounds and vertical dividers.
 */
export class EraRenderer {
  constructor(viewport) {
    this.viewport = viewport;
    this.group = this._createEraGroup();
    if (this.viewport.svg && this.group) {
      this.viewport.svg.appendChild(this.group);
    }
  }

  /**
   * Renders Era columns based on the actor's history.
   * GUARANTEE: Eras are contiguous; no overlap is rendered.
   */
  render(state) {
    if (!this.group || !this.viewport.actor) return;
    this.group.innerHTML = '';

    const rawEras = this.viewport.actor.system.eras || {};
    const sortedEras = Object.values(rawEras).sort((a, b) => (a.sort || 0) - (b.sort || 0));
    
    const rect = this.viewport.container.getBoundingClientRect();
    const height = rect.height || 500;
    const gutterHeight = 40;

    sortedEras.forEach((era, index) => {
        // Calculate screen bounds for the era
        const startAge = Number(era.age) || 0;
        const startX = this.viewport.worldToScreen(startAge, 0).x;
        
        // Find end age: next era start or end of visible graph
        const nextEra = sortedEras[index + 1];
        const endAge = nextEra ? Number(nextEra.age) : (state.nowNode?.age + 31536000) || 3153600000;
        const endX = this.viewport.worldToScreen(endAge, 0).x;
        const width = Math.max(0, endX - startX);

        if (width <= 0) return;

        // 1. Era Background (Low contrast blue)
        const rectEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rectEl.setAttribute('x', startX);
        rectEl.setAttribute('y', 0);
        rectEl.setAttribute('width', width);
        rectEl.setAttribute('height', height - gutterHeight);
        rectEl.style.fill = index % 2 === 0 ? 'rgba(0, 102, 255, 0.05)' : 'rgba(0, 102, 255, 0.02)';
        rectEl.style.pointerEvents = 'none';
        this.group.appendChild(rectEl);

        // 2. Vertical Divider
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', 0);
        line.setAttribute('x2', startX);
        line.setAttribute('y2', height - gutterHeight);
        line.style.stroke = 'rgba(74, 144, 226, 0.4)';
        line.style.strokeWidth = '1';
        line.style.pointerEvents = 'none';
        this.group.appendChild(line);

        // 3. Label (Top of column)
        if (width > 40) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', startX + 5);
            text.setAttribute('y', 20);
            text.style.fill = '#4da6ff';
            text.style.fontSize = '11px';
            text.style.fontFamily = 'monospace';
            text.style.fontWeight = 'bold';
            text.style.pointerEvents = 'none';
            text.textContent = era.name || `Era ${index + 1}`;
            this.group.appendChild(text);
        }
    });
  }

  _createEraGroup() {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-eras');
    g.style.pointerEvents = 'none';
    return g;
  }
}
