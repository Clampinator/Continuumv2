/**
 * Manages the display of rich contextual tooltips within the Span Graph.
 * REBUILT: Uses isolated double-pass layout to guarantee absolute tight-fit.
 * Styling is maintained in tooltips.css.
 */
export class TooltipManager {
  /**
   * @param {SpanGraphViewport} viewport - The viewport instance.
   * @param {SVGGElement} parentGroup - The HUD layer group.
   */
  constructor(viewport, parentGroup) {
    this.viewport = viewport;
    this.isVisible = false;
    this.group = this._createTooltipGroup(parentGroup);
    
    // AUTHORITY: Inject stylesheet if not already present
    this._injectStylesheet();
  }

  /**
   * Injects the external tooltips.css into the document head.
   */
  _injectStylesheet() {
      if (typeof document === 'undefined') return;
      const href = 'systems/continuum-v2/modules/span-graph/ui/tooltips.css';
      if (document.querySelector(`link[href="${href}"]`)) return;

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = href;
      link.media = 'all';
      document.head.appendChild(link);
  }

  /**
   * Shows the tooltip with the provided content at the specified position.
   */
  show(content, pos) {
    if (!this.group) return;

    const container = this.group.querySelector('.span-graph-tooltip-body');
    const fo = this.group.querySelector('foreignObject');
    const bg = this.group.querySelector('rect');
    if (!container || !fo || !bg) return;

    // 1. CONTENT PREPARATION
    let html = '';
    if (typeof content === 'string') {
        html = `<div class="tooltip-text-wrapper">${content}</div>`;
    } else if (Array.isArray(content)) {
        html = `<table class="tooltip-table">` + content.map(line => {
            const style = line.color ? `style="color: ${line.color}"` : '';
            return `<tr ${style}>
                <td class="tooltip-label">${line.label}:</td>
                <td class="tooltip-value">${line.value}</td>
            </tr>`;
        }).join('') + `</table>`;
    }

    // 2. ISOLATED MEASUREMENT PASS
    fo.setAttribute('width', '1');
    fo.setAttribute('height', '1');
    container.innerHTML = html;

    const wrapper = container.querySelector('.tooltip-table') || container.querySelector('.tooltip-text-wrapper');
    const width = Math.ceil(wrapper.offsetWidth) + 16;
    const height = Math.ceil(wrapper.offsetHeight) + 16;

    // 3. APPLY AUTHORITATIVE DIMENSIONS
    fo.setAttribute('width', width);
    fo.setAttribute('height', height);
    bg.setAttribute('width', width);
    bg.setAttribute('height', height);

    // 4. POSITIONING & CLAMPING
    this.isVisible = true;
    this.group.style.display = 'block';

    const viewRect = this.viewport.container.getBoundingClientRect();
    let x = pos.x + 15;
    let y = pos.y + 15;
    
    if (x + width > viewRect.width) x = pos.x - width - 10;
    if (y + height > viewRect.height) y = pos.y - height - 10;

    x = Math.max(5, Math.min(x, viewRect.width - width - 5));
    y = Math.max(5, Math.min(y, viewRect.height - height - 5));

    this.group.setAttribute('transform', `translate(${x}, ${y})`);
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
   * Creates the SVG group for the rich tooltip.
   * @private
   */
  _createTooltipGroup(parent) {
    if (typeof document === 'undefined') return null;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-tooltip-group');
    g.style.display = 'none';
    g.style.pointerEvents = 'none';

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('rx', '3');
    rect.setAttribute('ry', '3');
    rect.style.fill = 'rgba(0, 0, 0, 0.95)';
    rect.style.stroke = '#ffd700'; 
    rect.style.strokeWidth = '1.2';
    g.appendChild(rect);

    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.setAttribute('x', '0');
    fo.setAttribute('y', '0');

    const body = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
    body.setAttribute('class', 'span-graph-tooltip-body');
    body.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    
    fo.appendChild(body);
    g.appendChild(fo);

    if (parent) parent.appendChild(g);

    return g;
  }
}
