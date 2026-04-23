import { RailRenderer } from './renderers/rail-renderer.js';
import { GridRenderer } from './renderers/grid-renderer.js';
import { NodeRenderer } from './renderers/node-renderer.js';
import { CreationRenderer } from './renderers/creation-renderer.js';
import { EraRenderer } from './renderers/era-renderer.js';
import { AxisRenderer } from './renderers/axis-renderer.js';
import { ExperienceRenderer } from './renderers/experience-renderer.js';
import { TooltipManager } from './ui/tooltips.js';
import { parseDate, normalizeDateInput } from '../span-graph-utils/provide-span-graph-utils.js';
import { TARGET_RATIO } from '../temporal-engine/constants.js';

// ATOMIZED ACTIONS
import { calculateAutofocus } from './actions/handle-autofocus.js';
import { renderViewport } from './actions/handle-rendering.js';
import { updateGhostNodeHover, handleGhostNodeClick } from './actions/handle-ghost-node.js';

// ATOMIZED LISTENERS
import { activateListeners } from './listeners/activate-listeners.js';

/**
 * Manages the SVG viewport for the Span Graph.
 * ATOMIZED FINAL: Pure delegator class.
 */
export class SpanGraphViewport {
  constructor(container, actor = null) {
    this.container = container;
    this.actor = actor;
    
    this._interaction = {
        isDragging: false,
        hasSignificantMovement: false,
        type: null,
        nodeElement: null,
        startX: 0, startY: 0,
        startPanX: 0, startPanY: 0,
        startWorld: null,
        currentWorld: null,
        hoverWorldPos: null,
        mode: null,
        cachedHistory: null,
        cachedNow: 0,
        cachedOrigin: 0
    };

    this.viewState = {
      panX: 50, panY: 450, zoom: 0.1, 
      interactionMode: 'pan', initialized: false
    };

    this.svg = this._createSVG();
    if (this.container && this.svg) {
      this.container.appendChild(this.svg);
      
      // Layers
      this.gridLayer = this._createGroup('span-graph-grid-layer');
      this.contentLayer = this._createGroup('span-graph-content-layer');
      this.hudLayer = this._createGroup('span-graph-hud-layer');

      // Renderers
      this.gridRenderer = new GridRenderer(this, this.gridLayer);
      this.eraRenderer = new EraRenderer(this, this.gridLayer);
      this.experienceRenderer = new ExperienceRenderer(this, this.contentLayer); 
      this.railRenderer = new RailRenderer(this, this.contentLayer);           
      this.nodeRenderer = new NodeRenderer(this, this.contentLayer);           
      this.axisRenderer = new AxisRenderer(this, this.hudLayer);           
      this.creationRenderer = new CreationRenderer(this, this.hudLayer);   
      this.tooltipManager = new TooltipManager(this, this.hudLayer);

      activateListeners(this);
      
      if (this.actor) {
          this._render();
          setTimeout(() => this.autoFocus(), 150);
      }
    }
  }

  updateActor(actor) { this.actor = actor; this._render(); }

  _getOriginTime() {
      if (!this.actor) return 0;
      const dobStr = this.actor.system.personal?.dob || "";
      const dobDate = parseDate(normalizeDateInput(dobStr) + "T12:00:00");
      return dobDate ? dobDate.getTime() : 0;
  }

  autoFocus() {
      const updates = calculateAutofocus(this.actor, this.container, () => this._getOriginTime());
      if (updates) this.setViewState(updates);
  }

  setViewState(newState) { this.viewState = { ...this.viewState, ...newState }; this._render(); }
  
  _render() { renderViewport(this); }

  worldToScreen(xCoord, yCoordinate) {
    const { panX, panY, zoom } = this.viewState;
    return { x: (xCoord * zoom) + panX, y: (yCoordinate * TARGET_RATIO * zoom) + panY };
  }

  screenToWorld(x, y) {
    const { panX, panY, zoom } = this.viewState;
    return { age: (x - panX) / zoom, time: (y - panY) / (TARGET_RATIO * zoom) };
  }

  _createSVG() {
    if (typeof document === 'undefined') return null;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'span-graph-svg');
    svg.style.cssText = 'width:100%; height:100%; display:block; background:#000; overflow:hidden; cursor:crosshair; touch-action:none;';
    return svg;
  }

  _createGroup(className) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', className);
      this.svg.appendChild(g);
      return g;
  }

  _updateGhostNodeHover(x, y) { updateGhostNodeHover(this, x, y); }
  _handleGhostNodeClick() { handleGhostNodeClick(this); }
}
