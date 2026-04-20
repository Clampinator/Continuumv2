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
    }
  }

  /**
   * Creates the root SVG element.
   * @private
   */
  _createSVG() {
    // In a browser environment, this creates a real SVG.
    // In our test environment (Node/JSDOM), it will use the global document.
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
