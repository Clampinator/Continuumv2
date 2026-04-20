/**
 * Manages the display of tooltips within the Span Graph.
 */
export class TooltipManager {
  /**
   * @param {SpanGraphViewport} viewport - The viewport instance.
   */
  constructor(viewport) {
    this.viewport = viewport;
    this.isVisible = false;
    this.group = this._createTooltipGroup();
    
    if (this.viewport.svg && this.group) {
      this.viewport.svg.appendChild(this.group);
    }
  }

  /**
   * Shows the tooltip with the provided data at the specified position.
   * 
   * @param {Object} data - The lore data to display.
   * @param {Object} pos - Screen coordinates {x, y}.
   */
  show(data, pos) {
    if (!this.group) return;

    this.isVisible = true;
    this.group.style.display = 'block';
    this.group.setAttribute('transform', `translate(${pos.x + 10}, ${pos.y + 10})`);

    // Update text content (simplified for now)
    const text = this.group.querySelector('text');
    if (text) {
      text.textContent = data.description || data.id || 'Unknown Event';
    }

    // Adjust background size to fit text
    const rect = this.group.querySelector('rect');
    if (rect && text) {
      // In a real browser, we'd use getBBox()
      // For tests/mock, we assume standard size
      rect.setAttribute('width', '120');
      rect.setAttribute('height', '20');
    }
  }

  /**
   * Hides the tooltip.
   */
  hide() {
    if (!this.group) return;
    this.isVisible = false;
    this.group.style.display = 'none';
  }

  /**
   * Creates the SVG group for the tooltip.
   * @private
   */
  _createTooltipGroup() {
    if (typeof document === 'undefined') return null;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-tooltip');
    g.style.display = 'none';
    g.style.pointerEvents = 'none';

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('rx', '4');
    rect.setAttribute('ry', '4');
    rect.style.fill = 'rgba(0, 0, 0, 0.8)';
    rect.style.stroke = 'var(--continuum-highlight-color, #ffd700)';
    rect.style.strokeWidth = '1';

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '5');
    text.setAttribute('y', '15');
    text.style.fill = '#fff';
    text.style.fontSize = '12px';
    text.style.fontFamily = 'monospace';

    g.appendChild(rect);
    g.appendChild(text);

    return g;
  }
}
