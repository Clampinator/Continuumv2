/**
 * Manages the SVG viewport for the Span Graph.
 * Handles pan, zoom, and coordinate projection.
 */
export class SpanGraphViewport {
  /**
   * @param {HTMLElement} container - The DOM element to host the SVG.
   */
  constructor(container) {
    this.container = container;
    this.viewState = {
      panX: 0,
      panY: 0,
      zoom: 1
    };

    this.svg = this._createSVG();
    if (this.container && this.svg) {
      this.container.appendChild(this.svg);
      this._activateListeners();
    }
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
        for (const key in target) {
          nextState[key] = startState[key] + (target[key] - startState[key]) * ease;
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
    const anchor = { x: event.offsetX, y: event.offsetY };
    this.handleZoom(zoomFactor, anchor);
  }

  /**
   * Handles mouse down for panning.
   * @private
   */
  _onMouseDown(event) {
    if (event.button !== 0) return; // Only left click

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
    this.viewState = { ...this.viewState, ...state };
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
    return {
      x: (age * this.viewState.zoom) + this.viewState.panX,
      y: (time * this.viewState.zoom) + this.viewState.panY
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
    return {
      age: (x - this.viewState.panX) / this.viewState.zoom,
      time: (y - this.viewState.panY) / this.viewState.zoom
    };
  }

  /**
   * Updates the visual representation based on current state.
   * @private
   */
  _render() {
    // To be implemented in subsequent tasks
  }
}
