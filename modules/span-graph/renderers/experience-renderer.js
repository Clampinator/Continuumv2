/**
 * Renders the Experience Bounding Boxes and Labels.
 * REBUILT: Strict 4-corner authoritative geometry (Left/Right Age, Top/Bottom Time).
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

    const labelSlots = {};

    state.experiences.forEach((exp) => {
        // COORDINATE AUTHORITY: Project all 4 corners into screen space
        const pStart = this.viewport.worldToScreen(exp.startAge, exp.startTime);
        const pEnd = this.viewport.worldToScreen(exp.endAge, exp.endTime);

        const x = pStart.x;
        const y = Math.min(pStart.y, pEnd.y); // SVG coordinates: smaller Y is higher on screen
        const width = Math.max(1, pEnd.x - pStart.x);
        const height = Math.max(1, Math.abs(pEnd.y - pStart.y));

        // 1. Draw Experience Box (The Quadrilateral)
        const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        box.setAttribute('x', x);
        box.setAttribute('y', y);
        box.setAttribute('width', width);
        box.setAttribute('height', height);
        
        if (exp.isOngoing) {
            // Gradient Fade for Open Experiences
            const gradId = `grad-${exp.id}`;
            this._createGradient(gradId);
            box.style.fill = `url(#${gradId})`;
        } else {
            // Solid Yellow for Closed Experiences
            box.style.fill = 'rgba(255, 255, 0, 0.2)';
        }

        box.style.opacity = exp.opacity;
        box.style.pointerEvents = 'none';
        box.style.stroke = 'rgba(255, 255, 0, 0.4)';
        box.style.strokeWidth = '1px';
        this.group.appendChild(box);

        // 2. Draw Label (Anchored to top-left of box)
        if (width > 20 || exp.isOngoing) {
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

  _createExperienceGroup() {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-experiences');
    g.style.pointerEvents = 'none'; 
    return g;
  }
}
