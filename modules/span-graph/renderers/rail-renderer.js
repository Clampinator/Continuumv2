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
            
            if (rail.isInserting) el.classList.add('inserting');
            else if (rail.isFuture) el.classList.add('future');
            else el.classList.add('past');

            this.group.appendChild(el);
        }
        else if (rail.type === 'yet') {
            // Dashed cyan connector from NOW to a Yet node (future rail)
            const pathData = `M ${rail.p1.x} ${rail.p1.y} L ${rail.p2.x} ${rail.p2.y}`;
            const el = this._createPathElement(pathData, 'span-graph-yet-rail');
            this.group.appendChild(el);
        }
        else if (rail.type === 'rest') {
            // Green level rail for 24h rest duration
            const pathData = `M ${rail.p1.x} ${rail.p1.y} L ${rail.p2.x} ${rail.p2.y}`;
            const el = this._createPathElement(pathData, 'span-graph-rest-rail');
            this.group.appendChild(el);
        }
    });
  }

  _createPathElement(d, className) {
    if (typeof document === 'undefined') return null;
    this._injectStyles();
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

  _injectStyles() {
      if (document.getElementById('span-graph-rail-styles')) return;
      const style = document.createElement('style');
      style.id = 'span-graph-rail-styles';
      style.textContent = `
          .span-graph-rail {
              stroke: #00e5ff;
              stroke-width: 2;
          }
          .span-graph-span-line {
              stroke: #ff00ff;
              stroke-width: 3;
              stroke-dasharray: 6, 4;
              animation: span-flow 0.5s linear infinite;
          }
          .span-graph-span-line.inserting {
              stroke: #ff00ff;
              stroke-width: 3;
              stroke-dasharray: 4, 4;
              opacity: 0.85;
              animation: span-flow 0.3s linear infinite;
          }
          .span-graph-yet-rail {
              stroke: #00e5ff;
              stroke-width: 1.5;
              stroke-dasharray: 4, 6;
              opacity: 0.4;
          }
          .span-graph-rest-rail {
              stroke: #00ff00;
              stroke-width: 3;
              stroke-linecap: round;
              filter: drop-shadow(0 0 4px rgba(0, 255, 0, 0.9));
          }
          @keyframes span-flow {
              from { stroke-dashoffset: 20; }
              to { stroke-dashoffset: 0; }
          }
      `;
      document.head.appendChild(style);
  }

  _createRailGroup(parent) {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-rails');
    parent.appendChild(g);
    return g;
  }
}
