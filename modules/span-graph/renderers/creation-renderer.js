/**
 * Renders visual targets for creating new Eras and Experiences.
 */
export class CreationRenderer {
  constructor(viewport) {
    this.viewport = viewport;
    this.group = this._createCreationGroup();
    if (this.viewport.svg && this.group) {
      this.viewport.svg.appendChild(this.group);
    }
  }

  render() {
    if (!this.group || typeof document === 'undefined') return;

    this.group.innerHTML = '';
    const rect = this.viewport.container.getBoundingClientRect();
    const height = rect.height || 500;

    // 1. Create Era Bar (The bottom-most zone)
    const eraBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    eraBar.setAttribute('x', '0');
    eraBar.setAttribute('y', height - 20); // Solid bar at very bottom
    eraBar.setAttribute('width', '100%');
    eraBar.setAttribute('height', '20');
    eraBar.setAttribute('class', 'graph-creation-bar-era');
    eraBar.style.fill = '#00a8a8'; // Bright cyan/teal
    eraBar.style.cursor = 'ew-resize';
    
    const eraLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    eraLabel.setAttribute('x', '10');
    eraLabel.setAttribute('y', height - 6);
    eraLabel.style.fill = '#ff0000'; // Red text
    eraLabel.style.fontSize = '12px';
    eraLabel.style.fontFamily = 'monospace';
    eraLabel.style.fontWeight = 'bold';
    eraLabel.style.pointerEvents = 'none';
    eraLabel.textContent = 'CREATE ERA';

    this.group.appendChild(eraBar);
    this.group.appendChild(eraLabel);
  }

  _createCreationGroup() {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-creation-ui');
    return g;
  }
}
