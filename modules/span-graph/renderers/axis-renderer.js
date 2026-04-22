import { formatSubjectiveAge, convertTimestampToDateString } from '../../span-graph-utils/provide-span-graph-utils.js';

/**
 * Renders the authoritative axes and responsive labels (HUD layer).
 * Anchored to the viewport edges.
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

    // 1. Static HUD Backgrounds (Ensuring they stay at the edges)
    const xBg = this._createRect(0, height - gutterHeight, width, 40, 'graph-axis-label-bg');
    const yBg = this._createRect(0, 0, gutterWidth, height, 'graph-axis-label-bg');
    this.group.appendChild(xBg);
    this.group.appendChild(yBg);

    // 2. Static Titles
    // X Title: Moved slightly UP to avoid Age data collision
    const xTitle = this._createText(width / 2 + (gutterWidth/2), height - 30, 'SUBJECTIVE AGE', 'graph-axis-title', 'middle');
    // Y Title: Locked to far LEFT
    const yTitle = this._createText(12, height / 2, 'OBJECTIVE DATE', 'graph-axis-title', 'middle');
    yTitle.setAttribute('transform', `translate(12, ${height / 2}) rotate(-90)`);
    this.group.appendChild(xTitle);
    this.group.appendChild(yTitle);

    // 3. RESPONSIVE X-AXIS (AGE)
    const leftAge = this.viewport.screenToWorld(gutterWidth, 0).age;
    const rightAge = this.viewport.screenToWorld(width, 0).age;
    const ageRange = rightAge - leftAge;
    const ageStep = ageRange / 5;

    for (let i = 0; i <= 5; i++) {
        const age = leftAge + (ageStep * i);
        const screenX = this.viewport.worldToScreen(age, 0).x;
        if (screenX < gutterWidth - 5) continue;

        const tick = this._createLine(screenX, height - gutterHeight, screenX, height - gutterHeight + 5, '#ffffff');
        this.group.appendChild(tick);

        const labelStr = age === 0 ? 'Birth' : formatSubjectiveAge(age);
        const label = this._createText(screenX, height - 10, labelStr, 'graph-axis-text graph-axis-text-bold', 'middle');
        this.group.appendChild(label);
    }

    // 4. RESPONSIVE Y-AXIS (TIME)
    const topTime = this.viewport.screenToWorld(0, 0).time;
    const bottomTime = this.viewport.screenToWorld(0, height - gutterHeight).time;
    const timeRange = bottomTime - topTime;
    const timeStep = timeRange / 5;

    for (let i = 0; i <= 5; i++) {
        const time = topTime + (timeStep * i);
        const screenY = this.viewport.worldToScreen(0, time).y;
        if (screenY > height - gutterHeight) continue;

        const tick = this._createLine(gutterWidth - 5, screenY, gutterWidth, screenY, '#ffffff');
        this.group.appendChild(tick);

        const dt = convertTimestampToDateString(time);
        const labelX = gutterWidth - 10;
        
        // Multi-line Date (Right Aligned to the tick)
        const dateText = this._createText(labelX, screenY - 12, dt.date.split('T')[0], 'graph-axis-text graph-axis-text-bold', 'end');
        const timeText = this._createText(labelX, screenY, dt.date.split('T')[1]?.substring(0,5) || dt.time, 'graph-axis-text graph-axis-text-bold', 'end');
        const dayStr = new Date(time).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const dayText = this._createText(labelX, screenY + 12, dayStr, 'graph-axis-text', 'end');

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
    text.style.fill = '#ffffff'; // AUTHORITY: Force white text
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
