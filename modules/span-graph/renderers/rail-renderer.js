/**
 * DUMB RENDERER: RAIL RENDERER
 * Performs pure SVG drawing of Level Rails and Span Jumps.
 * FORBIDDEN from performing math or record lookups.
 */
export class RailRenderer {
  constructor(viewport, parentGroup) {
    this.viewport = viewport;
    this.group = this._createRailGroup(parentGroup);
  }

  /**
   * Renders the rails from a pre-calculated manifest.
   * 
   * @param {Object} manifest - The RenderManifest.
   */
  render(manifest) {
    if (!this.group || !manifest.rails) return;
    this.group.innerHTML = '';

    manifest.rails.forEach(rail => {
        if (rail.type === 'level') {
            const el = this._createPathElement(rail.path, 'span-graph-rail');
            this.group.appendChild(el);
        } 
        else if (rail.type === 'span') {
            const pathData = `M ${rail.p1.x} ${rail.p1.y} L ${rail.p2.x} ${rail.p2.y}`;
            const el = this._createPathElement(pathData, 'span-graph-span-line');
            
            if (rail.isFuture) el.classList.add('future');
            else el.classList.add('past');

            this.group.appendChild(el);
        }
    });
  }

  _createPathElement(d, className) {
    if (typeof document === 'undefined') return null;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', className);
    path.style.fill = 'none';
    
    if (className === 'span-graph-rail') {
        path.style.pointerEvents = 'stroke';
        path.style.cursor = 'crosshair';
    } else {
        path.style.pointerEvents = 'none';
    }
    
    return path;
  }

  _createRailGroup(parent) {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-rails');
    parent.appendChild(g);
    return g;
  }
}
