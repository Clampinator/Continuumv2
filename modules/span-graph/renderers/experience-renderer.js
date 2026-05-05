/**
 * DUMB RENDERER: EXPERIENCE RENDERER
 * Performs pure SVG drawing of experience boxes and labels.
 *
 * Receives a pre-calculated manifest with screen coordinates (x, y, width, height)
 * and domain properties (isOngoing, opacity, bonus). The renderer applies no
 * domain logic - it draws pixels based on what the manifest provides.
 *
 * Click interaction: Labels carry data-id and data-era-id attributes so the
 * Pointer Machine can route clicks to the experience edit dialog. Rects have
 * pointer-events disabled (they're visual containers) while labels have
 * pointer-events enabled so users can click through to the experience.
 */
export class ExperienceRenderer {
  constructor(viewport, parentGroup) {
    this.viewport = viewport;
    this.group = this._createExperienceGroup(parentGroup);
  }

  /**
   * Renders experiences from a pre-calculated manifest.
   *
   * @param {Object} manifest - The RenderManifest containing experiences array.
   */
  render(manifest) {
    if (!this.group || !manifest.experiences) return;
    this.group.innerHTML = '';

    const labelSlots = {};

    manifest.experiences.forEach(exp => {
        const { x, y, width, height, isOngoing, opacity, bonus, name, id, eraId } = exp;

        // 1. Draw Box (visual container - no pointer events so clicks pass through)
        const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        box.setAttribute('x', x);
        box.setAttribute('y', y);
        box.setAttribute('width', width);
        box.setAttribute('height', height);

        if (isOngoing) {
            const gradId = `grad-${id}`;
            this._createGradient(gradId);
            box.style.fill = `url(#${gradId})`;
        } else {
            box.style.fill = 'rgba(255, 255, 0, 0.2)';
        }

        box.style.opacity = opacity;
        // Rects are visual containers only - labels handle click interaction
        box.style.pointerEvents = 'none';
        box.style.stroke = 'rgba(255, 255, 0, 0.4)';
        box.style.strokeWidth = '1px';
        // Data attributes for click routing (even though pointer-events are none,
        // these serve as fallback identifiers for debugging and future use)
        box.setAttribute('data-id', id);
        box.setAttribute('data-era-id', eraId);
        this.group.appendChild(box);

        // 2. Draw Label (clickable - routes to experience edit dialog)
        if (width > 20 || isOngoing) {
            let slot = 0;
            while (this._isSlotOccupied(slot, x, x + width, labelSlots)) {
                slot++;
            }
            this._occupySlot(slot, x, x + width, labelSlots);

            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', x + 5);
            label.setAttribute('y', y + 12 + (slot * 12));
            label.style.fill = '#ffff00';
            label.style.fontSize = '10px';
            label.style.fontFamily = 'monospace';
            label.style.fontWeight = 'bold';
            label.style.opacity = opacity;
            // Labels are interactive so users can click to edit the experience
            label.style.pointerEvents = 'auto';
            label.setAttribute('data-id', id);
            label.setAttribute('data-era-id', eraId);
            label.classList.add('graph-exp-label');
            // Display bonus next to name when available
            const displayText = (bonus !== undefined && bonus !== null && bonus > 0)
                ? `${name} (+${bonus})`
                : name;
            label.textContent = displayText;
            this.group.appendChild(label);
        }
    });
  }

  _createGradient(id) {
      if (document.getElementById(id)) return;
      const defs = this.viewport.svg.querySelector('defs') || this._createDefs();
      const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      grad.setAttribute('id', id);
      grad.setAttribute('x1', '0%');
      grad.setAttribute('y1', '0%');
      grad.setAttribute('x2', '100%');
      grad.setAttribute('y2', '0%');

      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', 'rgba(255, 255, 0, 0.3)');

      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', 'rgba(255, 255, 0, 0)');

      grad.appendChild(stop1);
      grad.appendChild(stop2);
      defs.appendChild(grad);
  }

  _createDefs() {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      this.viewport.svg.prepend(defs);
      return defs;
  }

  _isSlotOccupied(slot, startX, endX, slots) {
      return !!slots[slot]; 
  }

  _occupySlot(slot, startX, endX, slots) {
      slots[slot] = true;
  }

  _createExperienceGroup(parent) {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-experiences');
    // Allow pointer events so experience labels can receive clicks
    g.style.pointerEvents = 'auto';
    parent.appendChild(g);
    return g;
  }
}
