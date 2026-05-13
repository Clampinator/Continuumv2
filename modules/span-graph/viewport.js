import { RailRenderer } from './renderers/rail-renderer.js';
import { GridRenderer } from './renderers/grid-renderer.js';
import { NodeRenderer } from './renderers/node-renderer.js';
import { CreationRenderer } from './renderers/creation-renderer.js';
import { EraRenderer } from './renderers/era-renderer.js';
import { AxisRenderer } from './renderers/axis-renderer.js';
import { ExperienceRenderer } from './renderers/experience-renderer.js';
import { GoalRenderer } from './renderers/goal-renderer.js';
import { YetRenderer } from './renderers/yet-renderer.js';
import { TooltipManager } from './ui/tooltips.js';
import { computeAxisLabels } from './projection/compute-axis-labels.js';
import { parseObjectiveTime } from '../temporal-translator/coordinate-converter.js';
import { resolveLocationContext } from '../temporal-translator/location-resolver.js';
import { TARGET_RATIO } from '../temporal-engine/constants.js';
import { getTemporalState } from '../temporal-engine/get-temporal-state.js';
import { buildRenderContext } from './projection/build-render-context.js';
import { generateManifest } from './projection/manifest-generator.js';
import { PointerMachine } from './interaction/pointer-machine.js';

// ATOMIZED ACTIONS
import { handleAutofocus } from './viewport/actions/handle-autofocus.js';
import { renderViewport } from './viewport/actions/handle-rendering.js';
import { autoCenter } from './actions/auto-center.js';

// ATOMIZED LISTENERS
import { activateListeners, deactivateListeners } from './viewport/listeners/activate-listeners.js';

/**
 * Manages the SVG viewport for the Span Graph.
 * ATOMIZED FINAL: Pure delegator class with persistent state authority.
 */
export class SpanGraphViewport {
  constructor(container, actor = null) {
    this.container = container;
    this.actor = actor;
    
    // PERSISTENT DATA AUTHORITY
    // The render loop (_render) rebuilds these on every pass. All interaction
    // handlers (PointerMachine, listeners) read from these caches rather than
    // re-deriving state from raw actor data. This is the Trinity contract:
    // the viewport never calls flattenEvents or getTemporalState outside _render.
    this.latestHistory = [];
    this.latestState = null;
    this.latestManifest = null;

    // Committed history baseline captured each render cycle.
    // Used by viewport._render() to build preview history during
    // insert-span drags, preventing preview stacking across frames.
    this._baseHistory = null;

    // THE INTERACTION MACHINE
    this.pointerMachine = new PointerMachine(this);

    // GOAL STATE: Shared between HUD interaction and goal renderer.
    // Set by the goal HUD listeners on hover/drag, read by the render pipeline.
    this._goalState = {
        highlightedGoalId: null,
        goalScreenPos: null,
        goalImportance: null,
        isFading: false
    };

    // LEGACY COMPATIBILITY (Will be decimated)
    this._interaction = {
        isDragging: false,
        mode: null,
        currentWorld: null,
        startWorld: null,
        nodeElement: null,
        insertionContext: null,
        displacementResult: null,
        yetDrag: null
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
      this.goalRenderer = new GoalRenderer(this, this.contentLayer);
      this.yetRenderer = new YetRenderer(this, this.contentLayer);

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

   // PROJECTION: Pre-computes formatted axis labels via TTL.
   // Called by the rendering orchestrator and passed to the dumb AxisRenderer.
   computeAxisLabels() {
       return computeAxisLabels(this);
   }

  autoFocus() {
      // GATE: No cached state means the render pass hasn't run yet,
      // or the character lacks origin data (render skips in that case).
      if (!this.latestState?.nodes?.length) return null;

      const updates = handleAutofocus(this);
      if (updates) this.setViewState(updates);
  }

   setViewState(newState) { this.viewState = { ...this.viewState, ...newState }; this._render(); }

   // AUTOCENTER: Re-attempt autofocus on each render until it succeeds.
   // The Lifeline section starts collapsed, so the container has zero size
   // on first open. Once the user expands it, _render fires but autoFocus
   // already returned null. This ensures birth node lands in the lower-left
   // quadrant the first time the graph has real dimensions.
   _ensureAutofocus() {
       if (this.viewState.initialized) return;
       const rect = this.container.getBoundingClientRect();
       if (rect.width === 0 || rect.height === 0) return;
       this.autoFocus();
   }

  /**
   * Centers the viewport on a specific subjective age.
   * Used for era navigation: double-click an era label to scroll to it.
   * @param {number} age - Subjective age in seconds to center on
   */
  centerOnAge(age) {
    const originTime = this._getOriginTime();
    const targetTime = originTime + (age * 1000);
    autoCenter(this, { eventAge: age, eventTime: targetTime });
  }
  
  /**
   * AUTHORITATIVE MASTER RENDER PASS
   * Gathers data and pushes it through the Dumb Pipe.
   */
   _render() { 
       if (!this.actor || !this.container) return;

       // GATE: Skip render when the character has no birth or inception data.
       // Without an origin timestamp all coordinates are meaningless, and the
       // render pass would produce an empty or broken graph.
       const personal = this.actor.system.personal || {};
       const structure = this.actor.system.structure || {};
       const hasCharOrigin = personal.dob && personal.birthLocation;
       const hasOrgOrigin = structure.inceptionDate && structure.locality;
       if (!hasCharOrigin && !hasOrgOrigin) return;

        // 1. PROJECTION: Build render context (history, subjectiveNow, isSpanIntent)
        // The viewport delegates all state assembly and NOW-node injection to
        // buildRenderContext - a pure function that never mutates DB state.
        const { history, subjectiveNow, originTime: builtOrigin, isSpanIntent } = buildRenderContext(
            this.actor, this._interaction, this._baseHistory, this.latestState?.nodes,
            () => this._getOriginTime()
        );
        this.latestHistory = history;

        // Capture committed baseline for future preview builds.
        // Only updated when NOT in insert-span drag, so each preview
        // build starts from the same committed state.
        const isInsertSpan = this._interaction.mode === 'insert-span'
            && this._interaction.isDragging
            && !this._interaction.isPending;
        if (!isInsertSpan) {
            this._baseHistory = this.latestHistory;
        }

        const originTime = builtOrigin;

       // 2. KERNEL (Physics Pass)
       this.latestState = getTemporalState(this.latestHistory, subjectiveNow, originTime, this.actor, isSpanIntent);

       // 3. PROJECTOR (UI Pass)
       this.latestManifest = generateManifest(this.latestState, this, this._interaction);

       // 4. THE DUMB PIPE PUSH
       renderViewport(this, this.latestState, this.latestManifest);

       // 5. AUTOCENTER: First render with real dimensions triggers autofocus.
       this._ensureAutofocus();
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

  destroy() {
    // Remove all event listeners to prevent window-level leak.
    // The window pointermove/pointerup listeners would otherwise fire
    // on every mouse event even after the viewport is gone, causing
    // performance degradation on every re-render cycle.
    deactivateListeners(this);

    // Remove SVG from DOM if still attached
    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }

    // Null out references so any stale calls bail fast
    this.container = null;
    this.actor = null;
  }
}
