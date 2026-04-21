import { getTemporalState } from '../temporal-engine/get-temporal-state.js';
import { RailRenderer } from './renderers/rail-renderer.js';
import { GridRenderer } from './renderers/grid-renderer.js';
import { NodeRenderer } from './renderers/node-renderer.js';
import { flattenEvents } from '../span-graph-data-processor.js';
import { getDragMode, constrainMovement } from './actions/drag-physics.js';

/**
 * Manages the SVG viewport for the Span Graph.
 * Handles pan, zoom, and coordinate projection.
 */
export class SpanGraphViewport {
  /**
   * @param {HTMLElement} container - The DOM element to host the SVG.
   * @param {Actor} [actor] - Optional actor to bind to.
   */
  constructor(container, actor = null) {
    this.container = container;
    this.actor = actor;
    this.viewState = {
      panX: 0,
      panY: 0,
      zoom: 1
    };

    this.svg = this._createSVG();
    if (this.container && this.svg) {
      this.container.appendChild(this.svg);
      
      this.gridRenderer = new GridRenderer(this);
      this.railRenderer = new RailRenderer(this);
      this.nodeRenderer = new NodeRenderer(this);

      this._activateListeners();
    }
  }

  /**
   * Updates the actor and triggers a re-render.
   * @param {Actor} actor - The new actor.
   */
  updateActor(actor) {
    this.actor = actor;
    this._render();
  }

  /**
   * Animates the view state to a new target.
   * @param {Object} target - Target view state properties.
   * @param {number} [duration=300] - Animation duration in ms.
   * @returns {Promise} Resolves when animation completes.
   */
  animateViewState(target, duration = 300) {
    const startState = { ...this.viewState };
    const startTime = performance.now();

    return new Promise(resolve => {
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing: Quadratic Out
        const ease = 1 - (1 - progress) * (1 - progress);

        const nextState = {};
        for (const [key, value] of Object.entries(target)) {
          nextState[key] = startState[key] + (value - startState[key]) * ease;
        }

        this.setViewState(nextState);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  /**
   * Attaches interaction listeners to the container.
   * @private
   */
  _activateListeners() {
    if (!this.container || typeof window === 'undefined') return;

    this.container.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
    this.container.addEventListener('mousedown', this._onMouseDown.bind(this));
  }

  /**
   * Handles wheel zoom event.
   * @private
   */
  _onWheel(event) {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    
    // AUTHORITY: Use clientX/Y and getBoundingClientRect for stable anchor points
    const rect = this.container.getBoundingClientRect();
    const anchor = { 
      x: event.clientX - rect.left, 
      y: event.clientY - rect.top 
    };
    
    this.handleZoom(zoomFactor, anchor);
  }

  /**
   * Handles mouse down for panning or dragging.
   * @private
   */
  _onMouseDown(event) {
    if (event.button !== 0) return; // Only left click

    const target = event.target;
    const isNode = target.classList.contains('graph-node-level') || 
                   target.classList.contains('graph-node-span') ||
                   target.classList.contains('graph-node-now');
    
    if (isNode) {
        this._startNodeDrag(event, target);
        return;
    }

    const startX = event.clientX;
    const startY = event.clientY;
    const initialPanX = this.viewState.panX;
    const initialPanY = this.viewState.panY;

    const onMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      this.setViewState({
        panX: initialPanX + dx,
        panY: initialPanY + dy
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  /**
   * Initiates a drag operation for a node.
   * @private
   */
  _startNodeDrag(event, nodeElement) {
    const startMouseX = event.clientX;
    const startMouseY = event.clientY;
    
    // Capture initial visual state
    const initialCX = parseFloat(nodeElement.getAttribute('cx')) || 0;
    const initialCY = parseFloat(nodeElement.getAttribute('cy')) || 0;
    
    const isNow = nodeElement.classList.contains('graph-node-now');
    
    // Capture initial world state for physics calculation
    const rect = this.container.getBoundingClientRect();
    const startWorld = this.screenToWorld(startMouseX - rect.left, startMouseY - rect.top);
    
    let dragMode = null;

    const onMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startMouseX;
      const dy = moveEvent.clientY - startMouseY;
      const dist = Math.hypot(dx, dy);

      // 1. Commit to a mode after slight movement
      if (!dragMode && dist > 5) {
          dragMode = getDragMode(dx, dy);
      }

      // If we haven't committed yet, just track mouse 1:1 for a responsive feel
      if (!dragMode) {
          nodeElement.setAttribute('cx', initialCX + dx);
          nodeElement.setAttribute('cy', initialCY + dy);
          return;
      }

      // 2. Calculate Constrained World Position
      const currentRect = this.container.getBoundingClientRect();
      const rawWorld = this.screenToWorld(moveEvent.clientX - currentRect.left, moveEvent.clientY - currentRect.top);
      const constrainedWorld = constrainMovement(rawWorld, startWorld, dragMode);

      // 3. Project back to Screen for Preview
      const screenPos = this.worldToScreen(constrainedWorld.age, constrainedWorld.time);
      
      nodeElement.setAttribute('cx', screenPos.x);
      nodeElement.setAttribute('cy', screenPos.y);
    };

    const onMouseUp = async (upEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      if (!dragMode) {
          this._render(); // Snap back if no movement
          return;
      }

      // Calculate final constrained world position
      const finalRect = this.container.getBoundingClientRect();
      const rawWorld = this.screenToWorld(upEvent.clientX - finalRect.left, upEvent.clientY - finalRect.top);
      const finalWorld = constrainMovement(rawWorld, startWorld, dragMode);
      
      // If it's the NOW node, trigger the log dialog
      if (isNow) {
          this._handleNowNodeDrop(finalWorld);
      } else {
          this._render(); // Snap back
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  /**
   * Triggers the event logging dialog.
   * @private
   */
  async _handleNowNodeDrop(worldPos) {
    // Bridges the new viewport back to the existing dialog system
    const { openEventDialog } = await import('../lifeline/services/ui/event-dialog/open-event-dialog.js');
    openEventDialog(this.actor.sheet, {
        mode: 'log',
        ageRaw: worldPos.age,
        timeRaw: worldPos.time
    });
  }

  /**
   * Manually updates the pan state.
   * @param {number} dx - Delta X.
   * @param {number} dy - Delta Y.
   */
  handlePan(dx, dy) {
    this.setViewState({
      panX: this.viewState.panX + dx,
      panY: this.viewState.panY + dy
    });
  }

  /**
   * Manually updates the zoom state relative to an anchor point.
   * @param {number} factor - Zoom multiplier.
   * @param {Object} [anchor] - Optional anchor point {x, y}.
   */
  handleZoom(factor, anchor) {
    const oldZoom = this.viewState.zoom;
    const newZoom = oldZoom * factor;

    if (!anchor) {
      this.setViewState({ zoom: newZoom });
      return;
    }

    // New Pan = Anchor - (Anchor - OldPan) * (NewZoom / OldZoom)
    const newPanX = anchor.x - (anchor.x - this.viewState.panX) * (newZoom / oldZoom);
    const newPanY = anchor.y - (anchor.y - this.viewState.panY) * (newZoom / oldZoom);

    this.setViewState({
      panX: newPanX,
      panY: newPanY,
      zoom: newZoom
    });
  }

  /**
   * Creates the root SVG element.
   * @private
   */
  _createSVG() {
    if (typeof document === 'undefined') return null;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'span-graph-svg');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.overflow = 'hidden';
    return svg;
  }

  /**
   * @returns {Object} Current view state {panX, panY, zoom}.
   */
  getViewState() {
    return { ...this.viewState };
  }

  /**
   * @param {Object} state - New view state.
   */
  setViewState(state) {
    // SANITY GUARD: Prevent NaN or non-finite values from corrupting the state
    const cleanState = {};
    for (const [key, value] of Object.entries(state)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        cleanState[key] = value;
      }
    }
    
    this.viewState = { ...this.viewState, ...cleanState };
    this._render();
  }

  /**
   * Projects world coordinates (Age, Time) to SVG screen space.
   * Screen = (World * Zoom) + Pan
   * 
   * @param {number} age - Subjective Age.
   * @param {number} time - Objective Time.
   * @returns {Object} {x, y} screen coordinates.
   */
  worldToScreen(age, time) {
    const zoom = Number(this.viewState.zoom) || 1;
    const panX = Number(this.viewState.panX) || 0;
    const panY = Number(this.viewState.panY) || 0;

    const x = (Number(age) || 0) * zoom + panX;
    const y = (Number(time) || 0) * zoom + panY;

    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0
    };
  }

  /**
   * Projects screen coordinates (X, Y) back to world space.
   * World = (Screen - Pan) / Zoom
   * 
   * @param {number} x - Screen X.
   * @param {number} y - Screen Y.
   * @returns {Object} {age, time} world coordinates.
   */
  screenToWorld(x, y) {
    const zoom = Number(this.viewState.zoom) || 1;
    const panX = Number(this.viewState.panX) || 0;
    const panY = Number(this.viewState.panY) || 0;

    // Prevent division by zero
    const safeZoom = zoom === 0 ? 1 : zoom;

    const age = (Number(x) - panX) / safeZoom;
    const time = (Number(y) - panY) / safeZoom;

    return {
      age: Number.isFinite(age) ? age : 0,
      time: Number.isFinite(time) ? time : 0
    };
  }

  /**
   * Updates the visual representation based on current state.
   * @private
   */
  _render() {
    if (!this.actor) return;
    
    const history = flattenEvents(this.actor.system.eras || {});
    const subjectiveNow = Number(this.actor.system.personal?.subjectiveNow) || 0;
    const state = getTemporalState(history, subjectiveNow);

    if (this.gridRenderer) this.gridRenderer.render();
    if (this.railRenderer) this.railRenderer.render(state.segments);
    if (this.nodeRenderer) this.nodeRenderer.render(state.events, state.nowNode);
  }
}
