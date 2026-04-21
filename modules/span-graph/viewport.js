import { getTemporalState } from '../temporal-engine/get-temporal-state.js';
import { RailRenderer } from './renderers/rail-renderer.js';
import { GridRenderer } from './renderers/grid-renderer.js';
import { NodeRenderer } from './renderers/node-renderer.js';
import { flattenEvents } from '../span-graph-data-processor.js';
import { getDragMode, constrainMovement } from './actions/drag-physics.js';
import { TooltipManager } from './ui/tooltips.js';
import { formatSubjectiveAge } from '../span-graph-utils/provide-span-graph-utils.js';

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
      zoom: 1,
      interactionMode: 'pan',
      dragStartWorld: null,
      activeDragType: null
    };

    this.svg = this._createSVG();
    if (this.container && this.svg) {
      this.container.appendChild(this.svg);
      
      this.gridRenderer = new GridRenderer(this);
      this.railRenderer = new RailRenderer(this);
      this.nodeRenderer = new NodeRenderer(this);
      this.tooltipManager = new TooltipManager(this);

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
   */
  async animateViewState(target, duration = 300) {
    const startState = { ...this.viewState };
    const startTime = performance.now();

    return new Promise(resolve => {
      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Simple ease-out
        const t = 1 - Math.pow(1 - progress, 2);

        const nextState = {};
        for (const key in target) {
          nextState[key] = startState[key] + (target[key] - startState[key]) * t;
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
   * Updates the viewport's view state.
   * @param {Object} newState - Partial view state.
   */
  setViewState(newState) {
    this.viewState = { ...this.viewState, ...newState };
    this._render();
  }

  /**
   * Returns a copy of the current view state.
   */
  getViewState() {
    return { ...this.viewState };
  }

  /**
   * Projects world coordinates to screen space.
   */
  worldToScreen(age, time) {
    const { panX, panY, zoom } = this.viewState;
    return {
      x: (age * zoom) + panX,
      y: (time * zoom) + panY
    };
  }

  /**
   * Projects screen coordinates back to world space.
   */
  screenToWorld(x, y) {
    const { panX, panY, zoom } = this.viewState;
    return {
      age: (x - panX) / zoom,
      time: (y - panY) / zoom
    };
  }

  /**
   * Renders all layers of the graph.
   * @private
   */
  _render() {
    if (!this.actor) return;

    const rawEras = this.actor.system.eras || {};
    const subjectiveNow = Number(this.actor.system.personal?.subjectiveNow) || 0;
    
    const history = flattenEvents(rawEras);
    console.log(`[SpanGraph] Rendering ${history.length} events for ${this.actor.name}`);
    
    const temporalState = getTemporalState(history, subjectiveNow);
    console.log(`[SpanGraph] Temporal State:`, temporalState);

    this.gridRenderer.render(temporalState, this.viewState);
    this.railRenderer.render(temporalState, this.viewState);
    this.nodeRenderer.render(temporalState, this.viewState);
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
    svg.style.display = 'block';
    svg.style.backgroundColor = 'transparent';
    svg.style.overflow = 'hidden';
    svg.style.cursor = 'crosshair';

    return svg;
  }

  /**
   * Sets up interaction listeners.
   * @private
   */
  _activateListeners() {
    if (!this.svg) return;

    // Handle SVG Interactions
    this.svg.addEventListener('mousedown', (event) => {
        // A. Node Dragging (NOW, Event, Span)
        const target = event.target;
        const nodeElement = target.closest('.graph-node-level, .graph-node-span, .graph-node-now');
        
        if (nodeElement) {
            console.log(`[SpanGraph] Starting drag for node: ${nodeElement.dataset.eventId || 'now'}`);
            event.stopPropagation();
            this._startNodeDrag(event, nodeElement);
            return;
        }

        // B. Era Bar (Creation) - bottom of SVG
        const rect = this.svg.getBoundingClientRect();
        const yRel = event.clientY - rect.top;
        if (yRel > rect.height - 60) { // Increased hit zone
            console.log(`[SpanGraph] Starting Era creation drag`);
            event.stopPropagation();
            this._startEraCreationDrag(event);
            return;
        }

        // C. Background Panning
        if (target === this.svg || target.closest('.span-graph-grid') || target.closest('.span-graph-rails')) {
            this._startPan(event);
        }
    });

    // Handle zooming
    this.svg.addEventListener('wheel', (event) => {
        event.preventDefault();
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        const rect = this.container.getBoundingClientRect();
        this.handleZoom(delta, { 
            x: event.clientX - rect.left, 
            y: event.clientY - rect.top 
        });
    }, { passive: false });
  }

  /**
   * Initiates a pan operation.
   * @private
   */
  _startPan(event) {
    const startX = event.clientX;
    const startY = event.clientY;
    const startPanX = this.viewState.panX;
    const startPanY = this.viewState.panY;

    this.viewState.interactionMode = 'panning';

    const onMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      this.setViewState({
        panX: startPanX + dx,
        panY: startPanY + dy
      });
    };

    const onMouseUp = () => {
      this.viewState.interactionMode = 'pan';
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
    
    const initialCX = parseFloat(nodeElement.getAttribute('cx')) || 0;
    const initialCY = parseFloat(nodeElement.getAttribute('cy')) || 0;
    
    const isNow = nodeElement.classList.contains('graph-node-now');
    
    const rect = this.container.getBoundingClientRect();
    const startWorld = this.screenToWorld(startMouseX - rect.left, startMouseY - rect.top);
    
    this.viewState.interactionMode = 'drag-node';
    this.viewState.dragStartWorld = startWorld;
    this.viewState.activeDragType = null;

    const onMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startMouseX;
      const dy = moveEvent.clientY - startMouseY;
      const dist = Math.hypot(dx, dy);

      if (!this.viewState.activeDragType && dist > 5) {
          this.viewState.activeDragType = getDragMode(dx, dy);
      }

      if (!this.viewState.activeDragType) {
          nodeElement.setAttribute('cx', initialCX + dx);
          nodeElement.setAttribute('cy', initialCY + dy);
          return;
      }

      const currentRect = this.container.getBoundingClientRect();
      const rawWorld = this.screenToWorld(moveEvent.clientX - currentRect.left, moveEvent.clientY - currentRect.top);
      const constrainedWorld = constrainMovement(rawWorld, this.viewState.dragStartWorld, this.viewState.activeDragType);

      const screenPos = this.worldToScreen(constrainedWorld.age, constrainedWorld.time);
      
      nodeElement.setAttribute('cx', screenPos.x);
      nodeElement.setAttribute('cy', screenPos.y);

      if (isNow && this.tooltipManager) {
          const dateObj = new Date(constrainedWorld.time);
          const dateStr = dateObj.toISOString().split('T')[0];
          const ageStr = constrainedWorld.age > 0 ? formatSubjectiveAge(constrainedWorld.age) : 'Birth';
          
          this.tooltipManager.show({
              description: `${dateStr} (${ageStr})${this.viewState.activeDragType === 'span' ? ' [SPAN]' : ''}`
          }, screenPos);
      }
    };

    const onMouseUp = async (upEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      if (this.tooltipManager) this.tooltipManager.hide();

      if (!this.viewState.activeDragType) {
          this.viewState.interactionMode = 'pan';
          this.viewState.dragStartWorld = null;
          this._render();
          return;
      }

      nodeElement.style.pointerEvents = 'none';
      const hitElement = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      nodeElement.style.pointerEvents = 'auto';

      const targetEventId = hitElement?.closest?.('circle')?.dataset?.eventId;

      const finalRect = this.container.getBoundingClientRect();
      const rawWorld = this.screenToWorld(upEvent.clientX - finalRect.left, upEvent.clientY - finalRect.top);
      const finalWorld = constrainMovement(rawWorld, this.viewState.dragStartWorld, this.viewState.activeDragType);
      
      if (isNow) {
          await this._handleNowNodeDrop(finalWorld, targetEventId);
      } else {
          this.viewState.interactionMode = 'pan';
          this.viewState.dragStartWorld = null;
          this.viewState.activeDragType = null;
          this._render();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  /**
   * Initiates an Era creation drag on the bottom axis.
   * @private
   */
  _startEraCreationDrag(event) {
    const startX = event.clientX;
    const rect = this.svg.getBoundingClientRect();
    const startWorld = this.screenToWorld(startX - rect.left, event.clientY - rect.top);
    
    this.viewState.interactionMode = 'create-era';

    const previewRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    previewRect.setAttribute('class', 'era-creation-preview');
    previewRect.style.fill = 'rgba(100, 255, 100, 0.2)';
    previewRect.style.stroke = '#00ff00';
    previewRect.style.strokeDasharray = '4,2';
    previewRect.setAttribute('y', rect.height - 35);
    previewRect.setAttribute('height', '30');
    this.svg.appendChild(previewRect);

    const onMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const width = Math.abs(dx);
      const x = dx > 0 ? (startX - rect.left) : (moveEvent.clientX - rect.left);
      
      previewRect.setAttribute('x', x);
      previewRect.setAttribute('width', width);
    };

    const onMouseUp = async (upEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (previewRect.parentNode) this.svg.removeChild(previewRect);
      this.viewState.interactionMode = 'pan';

      const endWorld = this.screenToWorld(upEvent.clientX - rect.left, upEvent.clientY - rect.top);
      
      const startAge = Math.min(startWorld.age, endWorld.age);
      const endAge = Math.max(startWorld.age, endWorld.age);

      if (endAge - startAge > 1) {
          const { openEraDialog } = await import('../lifeline/services/ui/era-dialog/open-era-dialog.js');
          openEraDialog(this.actor.sheet, { startAge, endAge });
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  /**
   * Handles dropping the NOW node.
   * @private
   */
  async _handleNowNodeDrop(worldPos, targetEventId = null) {
    if (targetEventId && this.viewState.activeDragType === 'level') {
        const rawEras = this.actor.system.eras || {};
        const events = flattenEvents(rawEras);
        const targetEvent = events.find(e => e.id === targetEventId);
        
        if (targetEvent) {
            await this.actor.update({ "system.personal.subjectiveNow": targetEvent.age });
            ui.notifications.info(`Updated Subjective Now to match event: ${targetEvent.description || targetEventId}`);
            
            this.viewState.interactionMode = 'pan';
            this.viewState.dragStartWorld = null;
            this.viewState.activeDragType = null;
            return;
        }
    }

    const { openEventDialog } = await import('../lifeline/services/ui/event-dialog/open-event-dialog.js');
    await openEventDialog(this.actor.sheet, {
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
   * Handles zooming.
   * @param {number} factor - Zoom factor.
   * @param {Object} [anchor] - Screen coordinates to zoom relative to.
   */
  handleZoom(factor, anchor = null) {
    const oldZoom = this.viewState.zoom;
    const newZoom = oldZoom * factor;
    
    const clampedZoom = Math.max(0.1, Math.min(newZoom, 10));
    
    if (!anchor) {
      this.setViewState({ zoom: clampedZoom });
      return;
    }

    const { panX, panY } = this.viewState;
    const actualFactor = clampedZoom / oldZoom;
    
    this.setViewState({
      zoom: clampedZoom,
      panX: anchor.x - (anchor.x - panX) * actualFactor,
      panY: anchor.y - (anchor.y - panY) * actualFactor
    });
  }
}
