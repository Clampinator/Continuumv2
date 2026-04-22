/**
 * Renders the Experience Bounding Boxes and Labels.
 * Implements "The Forgetting" fade and basic label collision avoidance.
 */
export class ExperienceRenderer {
  constructor(viewport) {
    this.viewport = viewport;
    this.group = this._createExperienceGroup();
    if (this.viewport.svg && this.group) {
      this.viewport.svg.appendChild(this.group);
    }
  }

  render(state) {
    if (!this.group || !state.experiences) return;
    this.group.innerHTML = '';

    const rect = this.viewport.container.getBoundingClientRect();
    const height = rect.height || 500;
    const gutterHeight = 40;

    // Track label vertical offsets to avoid collision
    const labelSlots = {}; // slotIndex -> boolean occupied in current X range

    state.experiences.forEach((exp) => {
        const startX = this.viewport.worldToScreen(exp.startAge, 0).x;
        const endX = this.viewport.worldToScreen(exp.endAge, 0).x;
        const width = Math.max(0, endX - startX);

        if (width <= 0 && !exp.isOngoing) return;

        // 1. Draw Experience Box
        const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        box.setAttribute('x', startX);
        box.setAttribute('y', 0);
        box.setAttribute('width', exp.isOngoing ? (rect.width - startX) : width);
        box.setAttribute('height', height - gutterHeight);
        
        // Styling based on state
        if (exp.isOngoing) {
            // Gradient Fade for Open Experiences
            const gradId = `grad-${exp.id}`;
            this._createGradient(gradId);
            box.style.fill = `url(#${gradId})`;
        } else {
            // Solid Yellow for Closed Experiences
            box.style.fill = 'rgba(255, 255, 0, 0.15)';
        }

        box.style.opacity = exp.opacity;
        box.style.pointerEvents = 'none';
        this.group.appendChild(box);

        // 2. Draw Label with Collision Avoidance
        if (width > 20 || exp.isOngoing) {
            // Find a vertical slot
            let slot = 0;
            while (this._isSlotOccupied(slot, startX, endX, labelSlots)) {
                slot++;
            }
            this._occupySlot(slot, startX, endX, labelSlots);

            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', startX + 5);
            label.setAttribute('y', 40 + (slot * 15)); // Stack labels vertically
            label.style.fill = '#ffff00';
            label.style.fontSize = '10px';
            label.style.fontFamily = 'monospace';
            label.style.fontWeight = 'bold';
            label.style.opacity = exp.opacity;
            label.style.pointerEvents = 'none';
            label.textContent = exp.name;
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
      stop1.setAttribute('stop-color', 'rgba(255, 255, 0, 0.2)');

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
      // Simplistic collision: just check if slot is used.
      // High-fidelity would check X-range overlap.
      return !!slots[slot]; 
  }

  _occupySlot(slot, startX, endX, slots) {
      slots[slot] = true;
  }

  _createExperienceGroup() {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-experiences');
    g.style.pointerEvents = 'none'; 
    return g;
  }
}
