/**
 * Renders the persistent Era bars and backgrounds.
 */
export class EraRenderer {
  constructor(viewport) {
    this.viewport = viewport;
    this.group = this._createEraGroup();
    if (this.viewport.svg && this.group) {
      this.viewport.svg.appendChild(this.group);
    }
  }

  render(state) {
    if (!this.group || !this.viewport.actor) return;
    this.group.innerHTML = '';

    const rawEras = this.viewport.actor.system.eras || {};
    const sortedEras = Object.values(rawEras).sort((a, b) => (a.sort || 0) - (b.sort || 0));
    
    const rect = this.viewport.container.getBoundingClientRect();
    const height = rect.height || 500;

    sortedEras.forEach((era, index) => {
        const startX = this.viewport.worldToScreen(Number(era.age) || 0, 0).x;
        const nextEra = sortedEras[index + 1];
        const endAge = nextEra ? Number(nextEra.age) : (state.nowNode?.age + 31536000) || 3153600000;
        const endX = this.viewport.worldToScreen(endAge, 0).x;
        const width = Math.max(5, endX - startX);

        // Vertical Boundary Line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', '0');
        line.setAttribute('x2', startX);
        line.setAttribute('y2', height - 40); // Stop at axes
        line.style.stroke = '#0055aa';
        line.style.strokeWidth = '1';
        line.style.pointerEvents = 'none';

        // Dark Blue Background
        const rectEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rectEl.setAttribute('x', startX);
        rectEl.setAttribute('y', '0');
        rectEl.setAttribute('width', width);
        rectEl.setAttribute('height', height - 40);
        rectEl.style.fill = 'rgba(0, 40, 100, 0.1)';
        rectEl.style.pointerEvents = 'none';
        
        // Label (Top Center)
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', startX + (width / 2));
        text.setAttribute('y', '20');
        text.setAttribute('text-anchor', 'middle');
        text.style.fill = '#00ccff';
        text.style.fontSize = '12px';
        text.style.fontFamily = 'monospace';
        text.style.fontWeight = 'bold';
        text.style.pointerEvents = 'none';
        text.textContent = era.name || `Era ${index + 1}`;

        this.group.appendChild(rectEl);
        this.group.appendChild(line);
        this.group.appendChild(text);
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
