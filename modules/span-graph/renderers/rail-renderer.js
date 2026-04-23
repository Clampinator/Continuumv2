/**
 * Renders the authoritative sequential path (Rails & Spans).
 * ADI REBUILT: Uses isolated x (age) and y (ts) coordinates.
 */
export class RailRenderer {
  constructor(viewport, parentGroup) {
    this.viewport = viewport;
    this.group = this._createRailGroup(parentGroup);
  }

  render(state, interaction = null) {
    if (!this.group) return;
    this.group.innerHTML = '';

    if (state.segments) {
        state.segments.forEach((seg, index) => {
            // 1. Draw the Blue Level Rail
            const railNodes = [...seg.nodes];
            railNodes.unshift(seg.arrivalNode);
            
            if (seg.exitPoint) {
                railNodes.push(seg.exitPoint);
            } else if (state.nowNode && state.nowNode.x >= seg.arrivalNode.x) {
                const isDraggingNow = interaction?.isDragging && interaction.nodeElement?.classList.contains('graph-node-now');
                const nowTarget = isDraggingNow ? interaction.currentWorld : state.nowNode;
                railNodes.push(nowTarget);
            }

            const pathData = this._generatePathData(railNodes);
            const rail = this._createPathElement(pathData, 'span-graph-rail');
            if (rail) this.group.appendChild(rail);

            // 2. Draw the Pink Vertical Span
            if (seg.exitPoint) {
                const departureNode = seg.exitPoint;
                const nextSeg = state.segments[index + 1];
                const arrivalNode = nextSeg?.arrivalNode;

                if (arrivalNode) {
                    // AUTHORITY: Use x and y coordinates
                    const p1 = this.viewport.worldToScreen(departureNode.x, departureNode.y);
                    const p2 = this.viewport.worldToScreen(arrivalNode.x, arrivalNode.y);
                    
                    const spanPath = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
                    const span = this._createPathElement(spanPath, 'span-graph-span');
                    
                    const isFuture = arrivalNode.y > departureNode.y;
                    if (isFuture) span.classList.add('future');
                    else span.classList.add('past');

                    this.group.appendChild(span);
                }
            }
        });
    }
  }

  _generatePathData(nodes) {
    const points = nodes.map(node => {
        // Support both RenderNode (x,y) and interaction worldPos (age,time)
        const x = node.x !== undefined ? node.x : node.age;
        const y = node.y !== undefined ? node.y : node.time;
        return this.viewport.worldToScreen(x, y);
    });

    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`);
    return d.join(' ');
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
    g.style.pointerEvents = 'none';
    parent.appendChild(g);
    return g;
  }
}
