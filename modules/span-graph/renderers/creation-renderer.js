/**
 * DUMB RENDERER: CREATION RENDERER
 * Performs pure SVG drawing of the creation bar at the end of history.
 */
export class CreationRenderer {
  constructor(viewport, parentGroup) {
    this.viewport = viewport;
    this.group = this._createCreationGroup(parentGroup);
  }

  /**
   * Renders the creation helper from a pre-calculated position.
   */
  render(startX) {
    if (!this.group || startX === null) return;
    this.group.innerHTML = '';

    const rect = this.viewport.container.getBoundingClientRect();
    const width = rect.width - startX;
    
    if (width > 0) {
        const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bar.setAttribute('x', startX);
        bar.setAttribute('y', 0);
        bar.setAttribute('width', width);
        bar.setAttribute('height', 30);
        bar.setAttribute('class', 'graph-creation-bar-era');
        
        bar.style.fill = 'rgba(255, 0, 255, 0.1)';
        bar.style.stroke = 'rgba(255, 0, 255, 0.3)';
        bar.style.strokeWidth = '1';
        bar.style.cursor = 'pointer';
        
        this.group.appendChild(bar);

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', startX + (width / 2));
        label.setAttribute('y', 18);
        label.setAttribute('text-anchor', 'middle');
        label.textContent = "+ CREATE NEW ERA";
        label.style.fill = '#ff00ff';
        label.style.fontSize = '10px';
        label.style.fontWeight = 'bold';
        label.style.fontFamily = 'monospace';
        label.style.pointerEvents = 'none';
        this.group.appendChild(label);
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
