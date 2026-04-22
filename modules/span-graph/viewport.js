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
import { formatSubjectiveAge, parseDate, normalizeDateInput } from '../span-graph-utils/provide-span-graph-utils.js';
import { TARGET_RATIO } from '../temporal-engine/constants.js';

/**
 * Manages the SVG viewport for the Span Graph.
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
        startX: 0,
        startY: 0,
        startPanX: 0,
        startPanY: 0,
        initialCX: 0,
        initialCY: 0,
        startWorld: null,
        currentWorld: null,
        hoverWorldPos: null,
        mode: null,
        cachedHistory: null,
        cachedNow: 0,
        cachedOrigin: 0
    };

    this.viewState = {
      panX: 50,
      panY: 450,
      zoom: 0.1, 
      interactionMode: 'pan',
      initialized: false
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

  updateActor(actor) { this.actor = actor; this._render(); }

  _getOriginTime() {
      if (!this.actor) return 0;
      const dobStr = this.actor.system.personal?.dob || "";
      const dobDate = parseDate(normalizeDateInput(dobStr) + "T12:00:00");
      return dobDate ? dobDate.getTime() : 0;
  }

  autoFocus() {
    if (!this.actor || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0) { setTimeout(() => this.autoFocus(), 200); return; }
    
    const history = flattenEvents(this.actor.system.eras || {});
    const subjectiveNow = Number(this.actor.system.personal?.subjectiveNow) || 0;
    const originTime = this._getOriginTime();
    
    const state = getTemporalState(history, subjectiveNow, originTime);
    const targetAge = state.nowNode?.age || 0;
    const targetTime = state.nowNode?.projectedTime || 0;

    const finalZoom = Math.max(0.00000001, Math.min(rect.width / (50 * 31536000), 1));
    const centerX = rect.width * 0.8;
    const centerY = rect.height * 0.2;
    this.setViewState({ zoom: finalZoom, panX: centerX - (targetAge * finalZoom), panY: centerY - (targetTime * TARGET_RATIO * finalZoom), initialized: true });
  }

  setViewState(newState) { this.viewState = { ...this.viewState, ...newState }; this._render(); }
  getViewState() { return { ...this.viewState }; }

  worldToScreen(age, time) {
    const { panX, panY, zoom } = this.viewState;
    return { x: (age * zoom) + panX, y: (time * TARGET_RATIO * zoom) + panY };
  }

  screenToWorld(x, y) {
    const { panX, panY, zoom } = this.viewState;
    return { age: (x - panX) / zoom, time: (y - panY) / (TARGET_RATIO * zoom) };
  }

  _render() {
    if (!this.actor || !this.container) return;
    const history = flattenEvents(this.actor.system.eras || {});
    const subjectiveNow = Number(this.actor.system.personal?.subjectiveNow) || 0;
    const originTime = this._getOriginTime();
    
    const state = getTemporalState(history, subjectiveNow, originTime);
    
    this.gridRenderer.render(state, this.viewState);
    this.eraRenderer.render(state);
    this.railRenderer.render(state, this._interaction);
    this.nodeRenderer.render(state, this.viewState, this._interaction.isDragging ? this._interaction.nodeElement : null, this._interaction);
    this.creationRenderer.render(state, this.viewState);
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
    svg.style.touchAction = 'none';
    return svg;
  }

  _activateListeners() {
    if (!this.svg) return;
    this.svg.addEventListener('pointerdown', this._onPointerDown.bind(this));
    if (typeof window !== 'undefined') {
        window.addEventListener('pointermove', this._onPointerMove.bind(this));
        window.addEventListener('pointerup', this._onPointerUp.bind(this));
    }
    this.svg.addEventListener('wheel', (event) => {
        event.preventDefault();
        const factor = event.deltaY > 0 ? 0.8 : 1.25;
        const rect = this.container.getBoundingClientRect();
        this.handleZoom(factor, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    }, { passive: false });
  }

  _onPointerDown(event) {
      const target = event.target;
      const rect = this.svg.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // AUTHORITY: Handle Ghost Node Click
      if (target.classList.contains('graph-node-ghost')) {
          this._handleGhostNodeClick();
          return;
      }

      const node = target.closest('.graph-node-level, .graph-node-span, .graph-node-now');
      
      const history = flattenEvents(this.actor.system.eras || {});
      const subjectiveNow = Number(this.actor.system.personal?.subjectiveNow) || 0;
      const originTime = this._getOriginTime();
      const state = getTemporalState(history, subjectiveNow, originTime);

      let nodeWorld = null;
      if (node) {
          if (node.classList.contains('graph-node-now')) {
              nodeWorld = { age: state.nowNode.age, time: state.nowNode.projectedTime };
          } else {
              const eventId = node.dataset.eventId;
              const targetEvent = state.events.find(e => e.id === eventId);
              if (targetEvent) {
                  nodeWorld = { age: targetEvent.age, time: targetEvent.projectedTime };
              }
          }
      }

      this._interaction = {
          isDragging: true,
          type: node ? 'node' : 'pan',
          nodeElement: node,
          startX: x, startY: y,
          startPanX: this.viewState.panX, startPanY: this.viewState.panY,
          initialCX: node ? parseFloat(node.getAttribute('cx')) : 0,
          initialCY: node ? parseFloat(node.getAttribute('cy')) : 0,
          startWorld: nodeWorld || this.screenToWorld(x, y),
          currentWorld: nodeWorld || this.screenToWorld(x, y),
          hoverWorldPos: null,
          hasSignificantMovement: false, mode: null,
          cachedHistory: history,
          cachedNow: subjectiveNow,
          cachedOrigin: originTime
      };
      if (this.svg.setPointerCapture) this.svg.setPointerCapture(event.pointerId);
  }

  _onPointerMove(event) {
      const rect = this.svg.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (!this._interaction.isDragging) {
          // AUTHORITY: Active hover detection for Ghost Nodes when not dragging
          this._updateGhostNodeHover(x, y);
          return;
      }

      const dx = x - this._interaction.startX;
      const dy = y - this._interaction.startY;

      if (!this._interaction.hasSignificantMovement) {
          if (Math.hypot(dx, dy) < 5) return;
          this._interaction.hasSignificantMovement = true;
          if (this._interaction.type === 'node') {
              this._interaction.mode = getDragMode(dx, dy);
              this.viewState.interactionMode = 'drag-node';
          }
      }

      if (this._interaction.type === 'node') {
          const rawWorld = this.screenToWorld(x, y);
          const world = constrainMovement(rawWorld, this._interaction.startWorld, this._interaction.mode);
          this._interaction.currentWorld = world;
          
          const screen = this.worldToScreen(world.age, world.time);

          this._interaction.nodeElement.setAttribute('cx', screen.x);
          this._interaction.nodeElement.setAttribute('cy', screen.y);
          if (this.tooltipManager) {
              const dateStr = new Date(world.time).toISOString().split('T')[0];
              this.tooltipManager.show({ description: `${dateStr} (${formatSubjectiveAge(world.age)})${this._interaction.mode === 'span' ? ' [SPAN]' : ''}` }, screen);
          }

          const state = getTemporalState(this._interaction.cachedHistory, this._interaction.cachedNow, this._interaction.cachedOrigin);
          this.railRenderer.render(state, this._interaction);
          this.nodeRenderer.render(state, this.viewState, this._interaction.nodeElement, this._interaction);
          
      } else if (this._interaction.type === 'pan') {
          this.viewState.panX = this._interaction.startPanX + dx;
          this.viewState.panY = this._interaction.startPanY + dy;
          requestAnimationFrame(() => this._render());
      }
  }

  _onPointerUp(event) {
      if (!this._interaction.isDragging) return;
      const state = this._interaction;
      if (this.tooltipManager) this.tooltipManager.hide();
      this.viewState.interactionMode = 'pan';
      if (state.hasSignificantMovement && state.type === 'node') {
          const world = constrainMovement(this.screenToWorld(event.clientX - this.svg.getBoundingClientRect().left, event.clientY - this.svg.getBoundingClientRect().top), state.startWorld, state.mode);
          this._handleNodeDrop(world, state.mode, state.nodeElement.classList.contains('graph-node-now'));
      }
      this._interaction.isDragging = false;
      this._render();
  }

  async _handleNodeDrop(worldPos, mode, isNow) {
    if (mode === 'span') {
        const { openSpanDialog } = await import('../lifeline/services/ui/span-dialog/open-span-dialog.js');
        await openSpanDialog(this.actor.sheet, {
            departure: this._interaction.startWorld,
            arrival: worldPos
        });
    } else {
        if (!isNow) return; 
        const { openEventDialog } = await import('../lifeline/services/ui/event-dialog/open-event-dialog.js'); 
        await openEventDialog(this.actor.sheet, { mode: 'log', ageRaw: worldPos.age, timeRaw: worldPos.time });
    }
  }

  _updateGhostNodeHover(mouseX, mouseY) {
      const history = flattenEvents(this.actor.system.eras || {});
      const subjectiveNow = Number(this.actor.system.personal?.subjectiveNow) || 0;
      const originTime = this._getOriginTime();
      const state = getTemporalState(history, subjectiveNow, originTime);
      
      let nearest = null;
      let minDist = 20;

      for (let i = 0; i < state.events.length - 1; i++) {
          const e1 = state.events[i];
          const e2 = state.events[i+1];
          
          // Don't insert into spans (they are vertical, age is the same)
          if (Number(e1.age) === Number(e2.age)) continue;

          const p1 = this.worldToScreen(e1.age, e1.projectedTime);
          const p2 = this.worldToScreen(e2.age, e2.projectedTime);
          
          const d = this._distToSegment({x: mouseX, y: mouseY}, p1, p2);
          if (d < minDist) {
              minDist = d;
              nearest = {
                  age: (Number(e1.age) + Number(e2.age)) / 2,
                  time: (Number(e1.projectedTime) + Number(e2.projectedTime)) / 2
              };
          }
      }

      this._interaction.hoverWorldPos = nearest;
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
      if (!this._interaction.hoverWorldPos) return;
      const pos = this._interaction.hoverWorldPos;
      const { openEventDialog } = await import('../lifeline/services/ui/event-dialog/open-event-dialog.js');
      await openEventDialog(this.actor.sheet, {
          mode: 'log',
          ageRaw: pos.age,
          timeRaw: pos.time
      });
  }

  handlePan(dx, dy) {
    this.setViewState({ panX: this.viewState.panX + dx, panY: this.viewState.panY + dy });
  }

  async animateViewState(target, duration = 300) {
    const startState = { ...this.viewState };
    const startTime = performance.now();
    return new Promise(resolve => {
      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const t = 1 - Math.pow(1 - progress, 2);
        const nextState = {};
        for (const key in target) { nextState[key] = startState[key] + (target[key] - startState[key]) * t; }
        this.setViewState(nextState);
        if (progress < 1) requestAnimationFrame(animate); else resolve();
      };
      requestAnimationFrame(animate);
    });
  }

  handleZoom(factor, anchor = null) {
    const oldZoom = this.viewState.zoom;
    const newZoom = Math.max(0.000000001, Math.min(oldZoom * factor, 100)); 
    if (!anchor) { this.setViewState({ zoom: newZoom }); return; }
    const actualFactor = newZoom / oldZoom;
    this.setViewState({ zoom: newZoom, panX: anchor.x - (anchor.x - this.viewState.panX) * actualFactor, panY: anchor.y - (anchor.y - this.viewState.panY) * actualFactor });
  }
}
