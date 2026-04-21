import { formatSubjectiveAge, convertTimestampToDateString } from '../../span-graph-utils/provide-span-graph-utils.js';

/**
 * Renders the authoritative axes and responsive labels (HUD layer).
 * GUARANTEE: Always displays exactly 5-6 labels evenly spaced across the visible view.
 */
export class AxisRenderer {
  constructor(viewport) {
    this.viewport = viewport;
    this.group = this._createAxisGroup();
    if (this.viewport.svg && this.group) {
      this.viewport.svg.appendChild(this.group);
    }
  }

  render() {
    if (!this.group || typeof document === 'undefined') return;
    this.group.innerHTML = '';

    const container = this.viewport.container;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    const gutterWidth = 110;
    const gutterHeight = 40;

    // 1. Static HUD Backgrounds
    const xBg = this._createRect(0, height - gutterHeight, width, 20, 'graph-axis-label-bg');
    const yBg = this._createRect(0, 0, gutterWidth, height - 20, 'graph-axis-label-bg');
    this.group.appendChild(xBg);
    this.group.appendChild(yBg);

    // 2. Static Titles
    const xTitle = this._createText(width / 2 + (gutterWidth/2), height - 26, 'SUBJECTIVE AGE', 'graph-axis-title', 'middle');
    const yTitle = this._createText(20, height / 2, 'OBJECTIVE DATE', 'graph-axis-title', 'middle');
    yTitle.setAttribute('transform', `translate(20, ${height / 2}) rotate(-90)`);
    this.group.appendChild(xTitle);
    this.group.appendChild(yTitle);

    // 3. RESPONSIVE X-AXIS (AGE) - Exactly 5 segments
    const leftAge = this.viewport.screenToWorld(gutterWidth, 0).age;
    const rightAge = this.viewport.screenToWorld(width, 0).age;
    const ageRange = rightAge - leftAge;
    const ageStep = ageRange / 5;

    for (let i = 0; i <= 5; i++) {
        const age = leftAge + (ageStep * i);
        const screenX = this.viewport.worldToScreen(age, 0).x;
        
        // Tick
        const tick = this._createLine(screenX, height - 40, screenX, height - 35, '#fff');
        this.group.appendChild(tick);

        // Label
        const label = this._createText(screenX + 2, height - 26, formatSubjectiveAge(age), 'graph-axis-text graph-axis-text-bold');
        if (age === 0) label.textContent = 'Birth';
        this.group.appendChild(label);
    }

    // 4. RESPONSIVE Y-AXIS (TIME) - Exactly 5 segments
    const topTime = this.viewport.screenToWorld(0, 0).time;
    const bottomTime = this.viewport.screenToWorld(0, height - gutterHeight).time;
    const timeRange = bottomTime - topTime;
    const timeStep = timeRange / 5;

    for (let i = 0; i <= 5; i++) {
        const time = topTime + (timeStep * i);
        const screenY = this.viewport.worldToScreen(0, time).y;

        // Tick
        const tick = this._createLine(gutterWidth - 5, screenY, gutterWidth, screenY, '#fff');
        this.group.appendChild(tick);

        // Multi-line Date Label
        const dt = convertTimestampToDateString(time);
        const dateText = this._createText(30, screenY - 14, dt.date.split('T')[0], 'graph-axis-text graph-axis-text-bold');
        const timeText = this._createText(30, screenY - 2, dt.date.split('T')[1]?.substring(0,8) || dt.time, 'graph-axis-text graph-axis-text-bold');
        const dayStr = new Date(time).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const dayText = this._createText(30, screenY + 10, dayStr, 'graph-axis-text graph-axis-text-bold');

        this.group.appendChild(dateText);
        this.group.appendChild(timeText);
        this.group.appendChild(dayText);
    }
  }

  _createRect(x, y, w, h, cls) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    if (cls) rect.setAttribute('class', cls);
    return rect;
  }

  _createText(x, y, txt, cls, anchor = 'start') {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    if (cls) text.setAttribute('class', cls);
    text.setAttribute('text-anchor', anchor);
    text.textContent = txt;
    return text;
  }

  _createLine(x1, y1, x2, y2, stroke) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.style.stroke = stroke;
    line.style.strokeWidth = '1';
    return line;
  }

  _createAxisGroup() {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-axes');
    g.style.pointerEvents = 'none'; 
    return g;
  }
}
