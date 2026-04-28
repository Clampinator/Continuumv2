import { RailRenderer } from './renderers/rail-renderer.js';
import { GridRenderer } from './renderers/grid-renderer.js';
import { NodeRenderer } from './renderers/node-renderer.js';
import { CreationRenderer } from './renderers/creation-renderer.js';
import { EraRenderer } from './renderers/era-renderer.js';
import { AxisRenderer } from './renderers/axis-renderer.js';
import { ExperienceRenderer } from './renderers/experience-renderer.js';
import { TooltipManager } from './ui/tooltips.js';
import { parseObjectiveTime } from '../temporal-translator/coordinate-converter.js';
import { resolveLocationContext } from '../temporal-translator/location-resolver.js';
import { TARGET_RATIO } from '../temporal-engine/constants.js';
import { getActorHistory } from '../state/get-actor-history.js';
import { getTemporalState } from '../temporal-engine/get-temporal-state.js';
import { generateManifest } from './projection/manifest-generator.js';
import { PointerMachine } from './interaction/pointer-machine.js';

// ATOMIZED ACTIONS
import { calculateAutofocus } from './viewport/actions/handle-autofocus.js';
import { renderViewport } from './viewport/actions/handle-rendering.js';

// ATOMIZED LISTENERS
import { activateListeners } from './viewport/listeners/activate-listeners.js';

/**
 * Manages the SVG viewport for the Span Graph.
 * ATOMIZED FINAL: Pure delegator class with persistent state authority.
 */
export class SpanGraphViewport {
  constructor(container, actor = null) {
    this.container = container;
    this.actor = actor;
    
    // PERSISTENT DATA AUTHORITY
    this.latestHistory = [];
    this.latestState = null;
    this.latestManifest = null;

    // THE INTERACTION MACHINE
    this.pointerMachine = new PointerMachine(this);

    // LEGACY COMPATIBILITY (Will be decimated)
    this._interaction = {
        isDragging: false,
        mode: null,
        currentWorld: null,
        startWorld: null,
        nodeElement: null
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
      const dobStr = this.actor.system.personal?.dob || "1970-01-01";
      const birthCtx = resolveLocationContext([], 0, this.actor);
      return parseObjectiveTime(dobStr, "12:00:00", birthCtx);
  }

  autoFocus() {
      const updates = calculateAutofocus(this.actor, this.container, () => this._getOriginTime());
      if (updates) this.setViewState(updates);
  }

  setViewState(newState) { this.viewState = { ...this.viewState, ...newState }; this._render(); }
  
  /**
   * AUTHORITATIVE MASTER RENDER PASS
   * Gathers data and pushes it through the Dumb Pipe.
   */
  _render() { 
      if (!this.actor || !this.container) return;

      const interaction = this._interaction;
      const isDraggingNow = interaction.isDragging || interaction.isPending;
      
      // 1. STATE (Database Pass)
      this.latestHistory = getActorHistory(this.actor);

      // HANDSHAKE: Inject Live Drag facts into the virtual history array
      // AUTHORITY: We update the 'objectiveNow' Fact, allowing the Kernel to derive physics.
      if (isDraggingNow && interaction.activeNodeId === 'now' && interaction.currentWorld) {
          const nowNode = this.latestHistory.find(n => n.id === 'now');
          if (nowNode) {
              nowNode.record.objectiveNow = interaction.currentWorld.eventTime;
          }
      }

      const originTime = this._getOriginTime();
      
      // AUTHORITY: Use the injected virtual history for the entire render pass.
      // If we are NOT dragging the NOW node, we pass null so the Kernel calculates its physical Age.
      // WE HAVE REMOVED THE FALLBACK TO subjectiveNow FROM THE DATABASE.
      const subjectiveNow = (isDraggingNow && interaction.activeNodeId === 'now') 
          ? interaction.currentWorld.eventAge 
          : null;

      const isSpanIntent = (isDraggingNow && interaction.activeNodeId === 'now' && interaction.mode === 'span');

      // 2. KERNEL (Physics Pass)
      this.latestState = getTemporalState(this.latestHistory, subjectiveNow, originTime, this.actor, isSpanIntent);

      // 3. PROJECTOR (UI Pass)
      this.latestManifest = generateManifest(this.latestState, this, interaction);

      // 4. THE DUMB PIPE PUSH
      renderViewport(this, this.latestState, this.latestManifest); 
  }

  worldToScreen(xCoord, yCoordinate) {
    const { panX, panY, zoom } = this.viewState;
    return { x: (xCoord * zoom) + panX, y: (yCoordinate * TARGET_RATIO * zoom) + panY };
  }

  screenToWorld(x, y) {
    const { panX, panY, zoom } = this.viewState;
    return { eventAge: (x - panX) / zoom, eventTime: (y - panY) / (TARGET_RATIO * zoom) };
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

  // REWIRED TO INTERACTION MACHINE
  _updateGhostNodeHover(x, y) { /* Deprecated */ }
  _handleGhostNodeClick() { /* Deprecated */ }
}
