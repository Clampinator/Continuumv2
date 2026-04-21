import { getTemporalState } from '../temporal-engine/get-temporal-state.js';
import { RailRenderer } from './renderers/rail-renderer.js';
import { GridRenderer } from './renderers/grid-renderer.js';
import { NodeRenderer } from './renderers/node-renderer.js';
import { CreationRenderer } from './renderers/creation-renderer.js';
import { EraRenderer } from './renderers/era-renderer.js';
import { AxisRenderer } from './renderers/axis-renderer.js';
import { flattenEvents } from '../span-graph-data-processor.js';
import { getDragMode, constrainMovement } from './actions/drag-physics.js';
import { TooltipManager } from './ui/tooltips.js';
import { formatSubjectiveAge } from '../span-graph-utils/provide-span-graph-utils.js';
import { TARGET_RATIO } from '../temporal-engine/constants.js';

/**
 * Manages the SVG viewport for the Span Graph.
 */
export class SpanGraphViewport {
  constructor(container, actor = null) {
    this.container = container;
    this.actor = actor;
    this.viewState = {
      panX: 50,
      panY: 450,
      zoom: 0.1, 
      interactionMode: 'pan',
      dragStartWorld: null,
      activeDragType: null,
      initialized: false,
      creationStartAgeSeconds: 0,
      creationCurrentAgeSeconds: 0,
      hoverWorldPos: null
    };

    this.svg = this._createSVG();
    if (this.container && this.svg) {
      this.container.appendChild(this.svg);
      this.gridRenderer = new GridRenderer(this);
      this.eraRenderer = new EraRenderer(this);
      this.railRenderer = new RailRenderer(this);
      this.nodeRenderer = new NodeRenderer(this);
      this.creationRenderer = new CreationRenderer(this);
      this.axisRenderer = new AxisRenderer(this);
      this.tooltipManager = new TooltipManager(this);
      this._activateListeners();
      if (this.actor) {
          this._render();
          setTimeout(() => this.autoFocus(), 150);
      }
    }
  }

  updateActor(actor) {
    this.actor = actor;
    this._render();
  }

  autoFocus() {
    if (!this.actor || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0) {
        setTimeout(() => this.autoFocus(), 200);
        return;
    }

    const rawEras = this.actor.system.eras || {};
    const subjectiveNow = Number(this.actor.system.personal?.subjectiveNow) || 0;
    const history = flattenEvents(rawEras);
    const state = getTemporalState(history, subjectiveNow);

    const targetAge = state.nowNode?.age || 0;
    const targetTime = state.nowNode?.projectedTime || 0;

    const targetZoom = rect.width / (50 * 31536000); 
    const finalZoom = Math.max(0.00000001, Math.min(targetZoom, 1));

    const centerX = rect.width * 0.8;
    const centerY = rect.height * 0.2;

    this.setViewState({
        zoom: finalZoom,
        panX: centerX - (targetAge * finalZoom),
        panY: centerY - (targetTime * TARGET_RATIO * finalZoom),
        initialized: true
    });
  }

  setViewState(newState) {
    this.viewState = { ...this.viewState, ...newState };
    this._render();
  }

  getViewState() {
    return { ...this.viewState };
  }

  worldToScreen(age, time) {
    const { panX, panY, zoom } = this.viewState;
    return {
      x: (age * zoom) + panX,
      y: (time * TARGET_RATIO * zoom) + panY
    };
  }

  screenToWorld(x, y) {
    const { panX, panY, zoom } = this.viewState;
    return {
      age: (x - panX) / zoom,
      time: (y - panY) / (TARGET_RATIO * zoom)
    };
  }

  _render() {
    if (!this.actor) return;
    const rawEras = this.actor.system.eras || {};
    const subjectiveNow = Number(this.actor.system.personal?.subjectiveNow) || 0;
    const history = flattenEvents(rawEras);
    const temporalState = getTemporalState(history, subjectiveNow);

    this.gridRenderer.render(temporalState, this.viewState);
    this.eraRenderer.render(temporalState);
    this.railRenderer.render(temporalState, this.viewState);
    this.nodeRenderer.render(temporalState, this.viewState);
    this.creationRenderer.render(temporalState, this.viewState);
    this.axisRenderer.render();
  }

  _createSVG() {
    if (typeof document === 'undefined') return null;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'span-graph-svg');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.display = 'block';
    svg.style.backgroundColor = '#000';
    svg.style.overflow = 'hidden';
    svg.style.cursor = 'crosshair';
    return svg;
  }

  _activateListeners() {
    if (!this.svg) return;

    this.svg.addEventListener('mousedown', (event) => {
        const target = event.target;
        
        // Ghost Node Click
        if (target.classList.contains('graph-node-ghost')) {
            event.stopPropagation();
            this._handleGhostNodeClick();
            return;
        }

        // Node Dragging
        const nodeElement = target.closest('.graph-node-level, .graph-node-span, .graph-node-now');
        if (nodeElement) {
            event.stopPropagation();
            this._startNodeDrag(event, nodeElement);
            return;
        }

        // Era Bar
        if (target.classList.contains('graph-creation-bar-era')) {
            event.stopPropagation();
            this._startEraCreationDrag(event);
            return;
        }

        // Background Panning
        if (target === this.svg || target.closest('.span-graph-grid') || target.closest('.span-graph-rails') || target.closest('.span-graph-eras')) {
            this._startPan(event);
        }
    });

    this.svg.addEventListener('mousemove', (event) => {
        if (this.viewState.interactionMode !== 'pan') return;
        
        // Detect hover over rails for ghost nodes
        const rect = this.svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Find if we are near a rail segment
        this._updateGhostNodeHover(mouseX, mouseY);
    });

    this.svg.addEventListener('wheel', (event) => {
        event.preventDefault();
        const factor = event.deltaY > 0 ? 0.8 : 1.25;
        const rect = this.container.getBoundingClientRect();
        this.handleZoom(factor, { 
            x: event.clientX - rect.left, 
            y: event.clientY - rect.top 
        });
    }, { passive: false });
  }

  _startPan(event) {
    const startX = event.clientX;
    const startY = event.clientY;
    const startPanX = this.viewState.panX;
    const startPanY = this.viewState.panY;
    this.viewState.interactionMode = 'panning';
    const onMouseMove = (moveEvent) => {
      this.setViewState({
        panX: startPanX + (moveEvent.clientX - startX),
        panY: startPanY + (moveEvent.clientY - startY)
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

      const currentRect = this.container.getBoundingClientRect();
      let screenPos;

      if (!this.viewState.activeDragType) {
          screenPos = { x: initialCX + dx, y: initialCY + dy };
      } else {
          const rawWorld = this.screenToWorld(moveEvent.clientX - currentRect.left, moveEvent.clientY - currentRect.top);
          const constrainedWorld = constrainMovement(rawWorld, this.viewState.dragStartWorld, this.viewState.activeDragType);
          screenPos = this.worldToScreen(constrainedWorld.age, constrainedWorld.time);
          
          if (isNow && this.tooltipManager) {
              const dateObj = new Date(constrainedWorld.time);
              const dateStr = dateObj.toISOString().split('T')[0];
              const ageStr = constrainedWorld.age > 0 ? formatSubjectiveAge(constrainedWorld.age) : 'Birth';
              this.tooltipManager.show({ description: `${dateStr} (${ageStr})${this.viewState.activeDragType === 'span' ? ' [SPAN]' : ''}` }, screenPos);
          }
      }
      
      nodeElement.setAttribute('cx', screenPos.x);
      nodeElement.setAttribute('cy', screenPos.y);
    };

    const onMouseUp = async (upEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (this.tooltipManager) this.tooltipManager.hide();

      if (!this.viewState.activeDragType) {
          this.viewState.interactionMode = 'pan';
          this._render();
          return;
      }

      const finalRect = this.container.getBoundingClientRect();
      const rawWorld = this.screenToWorld(upEvent.clientX - finalRect.left, upEvent.clientY - finalRect.top);
      const finalWorld = constrainMovement(rawWorld, this.viewState.dragStartWorld, this.viewState.activeDragType);
      
      if (isNow) {
          await this._handleNowNodeDrop(finalWorld);
      } else {
          this.viewState.interactionMode = 'pan';
          this._render();
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  _startEraCreationDrag(event) {
    const startX = event.clientX;
    const rect = this.svg.getBoundingClientRect();
    const startWorld = this.screenToWorld(startX - rect.left, event.clientY - rect.top);
    
    this.viewState.interactionMode = 'create-era';
    this.viewState.creationStartAgeSeconds = startWorld.age;

    const previewRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    previewRect.style.fill = 'rgba(255, 100, 100, 0.3)';
    previewRect.style.stroke = '#ff0000';
    previewRect.setAttribute('y', rect.height - 20); 
    previewRect.setAttribute('height', '20');
    this.svg.appendChild(previewRect);

    const onMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      previewRect.setAttribute('x', dx > 0 ? (startX - rect.left) : (moveEvent.clientX - rect.left));
      previewRect.setAttribute('width', Math.abs(dx));
      
      const currentWorld = this.screenToWorld(moveEvent.clientX - rect.left, moveEvent.clientY - rect.top);
      this.viewState.creationCurrentAgeSeconds = currentWorld.age;
    };

    const onMouseUp = async (upEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (previewRect.parentNode) this.svg.removeChild(previewRect);
      this.viewState.interactionMode = 'pan';

      const endWorld = this.screenToWorld(upEvent.clientX - rect.left, upEvent.clientY - rect.top);
      this.viewState.creationCurrentAgeSeconds = endWorld.age;
      
      const startAge = Math.min(this.viewState.creationStartAgeSeconds, this.viewState.creationCurrentAgeSeconds);
      const endAge = Math.max(this.viewState.creationStartAgeSeconds, this.viewState.creationCurrentAgeSeconds);

      if (endAge - startAge > 1) {
          const rawEras = this.actor.system.eras || {};
          const sortedEras = Object.values(rawEras).sort((a,b) => (a.sort || 0) - (b.sort || 0));
          const history = flattenEvents(rawEras);
          const temporalState = getTemporalState(history, Number(this.actor.system.personal?.subjectiveNow) || 0);

          const { showCreateEraDialog } = await import('../span-graph-dialog-create-age.js');
          showCreateEraDialog(
              this.viewState, 
              temporalState, 
              this.actor.sheet, 
              this.svg, 
              (endAge - startAge), 
              sortedEras
          );
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  _updateGhostNodeHover(mouseX, mouseY) {
      // Robust rail proximity detection
      const rawEras = this.actor.system.eras || {};
      const history = flattenEvents(rawEras);
      const temporalState = getTemporalState(history, Number(this.actor.system.personal?.subjectiveNow) || 0);
      
      let nearest = null;
      let minDist = 20; // 20px threshold

      for (let i = 0; i < temporalState.events.length - 1; i++) {
          const e1 = temporalState.events[i];
          const e2 = temporalState.events[i+1];
          if (e2.isSpan) continue; // Don't insert into spans

          const p1 = this.worldToScreen(e1.age, e1.projectedTime);
          const p2 = this.worldToScreen(e2.age, e2.projectedTime);
          
          // Distance from point to line segment
          const d = this._distToSegment({x: mouseX, y: mouseY}, p1, p2);
          if (d < minDist) {
              minDist = d;
              // Midpoint in world space
              nearest = {
                  age: (e1.age + e2.age) / 2,
                  time: (e1.projectedTime + e2.projectedTime) / 2
              };
          }
      }

      this.viewState.hoverWorldPos = nearest;
      this.nodeRenderer.renderGhostNode(nearest);
  }

  _distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  async _handleGhostNodeClick() {
      if (!this.viewState.hoverWorldPos) return;
      const { openEventDialog } = await import('../lifeline/services/ui/event-dialog/open-event-dialog.js');
      await openEventDialog(this.actor.sheet, {
          mode: 'log',
          ageRaw: this.viewState.hoverWorldPos.age,
          timeRaw: this.viewState.hoverWorldPos.time
      });
  }

  async _handleNowNodeDrop(worldPos) {
    const { openEventDialog } = await import('../lifeline/services/ui/event-dialog/open-event-dialog.js');
    await openEventDialog(this.actor.sheet, {
        mode: 'log',
        ageRaw: worldPos.age,
        timeRaw: worldPos.time
    });
  }

  handleZoom(factor, anchor = null) {
    const oldZoom = this.viewState.zoom;
    const newZoom = Math.max(0.000000001, Math.min(oldZoom * factor, 100)); 
    if (!anchor) {
      this.setViewState({ zoom: newZoom });
      return;
    }
    const { panX, panY } = this.viewState;
    const actualFactor = newZoom / oldZoom;
    this.setViewState({
      zoom: newZoom,
      panX: anchor.x - (anchor.x - panX) * actualFactor,
      panY: anchor.y - (anchor.y - panY) * actualFactor
    });
  }
}
