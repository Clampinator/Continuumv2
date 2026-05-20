/**
 * DUMB RENDERER: AXIS RENDERER
 * Performs pure SVG drawing of the HUD axes and labels.
 * Receives pre-formatted label strings from computeAxisLabels().
 * FORBIDDEN from calling TTL, Kernel, or State functions.
 */
export class AxisRenderer {
  constructor(viewport, parentGroup) {
    this.viewport = viewport;
    this.group = this._createAxisGroup(parentGroup);
  }

  render(axisData) {
    if (!this.group) return;
    this.group.innerHTML = '';

    if (!axisData) return;

    const { ageLabels, timeLabels, width, height, gutterHeight } = axisData;
    const labelX = 14;
    const xAxisY = height - gutterHeight;

    // 1. X-AXIS (Subjective Age)
    // The 5px offset prevents tick from overlapping axis labels
    for (const { screenX, label } of ageLabels) {
      const text = this._createText(screenX, xAxisY + 13, label, 'graph-axis-text', 'middle');
      this.group.appendChild(text);

      const tick = this._createTick(screenX, xAxisY - 15, screenX, xAxisY - 10);
      this.group.appendChild(tick);
    }

    const ageHeader = this._createText(width / 2, xAxisY + 28, 'SUBJECTIVE AGE', 'graph-axis-text graph-axis-text-bold', 'middle');
    this.group.appendChild(ageHeader);

    // 2. Y-AXIS (Objective Time)
    for (const { screenY, date, time } of timeLabels) {
      const dateText = this._createText(labelX, screenY - 5, date, 'graph-axis-text', 'start');
      this.group.appendChild(dateText);

      const timeText = this._createText(labelX, screenY + 7, time, 'graph-axis-text graph-axis-text-bold', 'start');
      this.group.appendChild(timeText);

      const tick = this._createTick(labelX + 2, screenY, labelX + 7, screenY);
      this.group.appendChild(tick);
    }

    const dateHeader = this._createText(5, (height - gutterHeight) / 2, 'OBJECTIVE DATE', 'graph-axis-text graph-axis-text-bold', 'middle');
    dateHeader.setAttribute('transform', `rotate(-90, 5, ${(height - gutterHeight) / 2})`);
    this.group.appendChild(dateHeader);
  }

  _createText(x, y, content, className, anchor = 'end') {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('class', className);
    text.setAttribute('text-anchor', anchor);
    text.textContent = content;
    text.style.fill = '#fff';
    text.style.fontSize = '9px';
    text.style.fontFamily = 'monospace';
    return text;
  }

  _createTick(x1, y1, x2, y2) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.style.stroke = '#fff';
    line.style.strokeWidth = '1';
    return line;
  }

  _createAxisGroup(parent) {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-axes');
    parent.appendChild(g);
    return g;
  }
}