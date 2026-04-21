import { SECONDS_IN_YEAR, SECONDS_IN_DAY } from '../../temporal-engine/constants.js';
import { formatSubjectiveAge, convertTimestampToDateString } from '../../span-graph-utils/provide-span-graph-utils.js';

/**
 * Renders the axes and labels (on top of other layers).
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

    const { zoom } = this.viewport.viewState;
    const interval = this.getInterval(zoom);
    const container = this.viewport.container;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    
    // Axis Backgrounds
    // X Axis (Bottom)
    const xBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    xBg.setAttribute('x', '0');
    xBg.setAttribute('y', height - 40); // 20px height
    xBg.setAttribute('width', '100%');
    xBg.setAttribute('height', '20');
    xBg.setAttribute('class', 'graph-axis-label-bg');
    this.group.appendChild(xBg);

    // Y Axis (Left)
    const yBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    yBg.setAttribute('x', '0');
    yBg.setAttribute('y', '0');
    yBg.setAttribute('width', '110'); // wide enough for date/time
    yBg.setAttribute('height', height - 20);
    yBg.setAttribute('class', 'graph-axis-label-bg');
    this.group.appendChild(yBg);

    // X Axis Title
    const xTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xTitle.setAttribute('x', width / 2);
    xTitle.setAttribute('y', height - 26);
    xTitle.setAttribute('text-anchor', 'middle');
    xTitle.setAttribute('class', 'graph-axis-title');
    xTitle.textContent = 'SUBJECTIVE AGE';
    this.group.appendChild(xTitle);

    // Y Axis Title
    const yTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yTitle.setAttribute('transform', `translate(20, ${height / 2}) rotate(-90)`);
    yTitle.setAttribute('text-anchor', 'middle');
    yTitle.setAttribute('class', 'graph-axis-title');
    yTitle.textContent = 'OBJECTIVE DATE';
    this.group.appendChild(yTitle);

    // X Axis Labels
    const leftWorld = this.viewport.screenToWorld(0, 0).age;
    const rightWorld = this.viewport.screenToWorld(width, 0).age;
    const startAge = Math.floor(leftWorld / interval) * interval;

    for (let age = startAge; age <= rightWorld; age += interval) {
      const screenX = this.viewport.worldToScreen(age, 0).x;
      if (screenX < 110) continue; // Don't draw over Y-axis

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', screenX + 2);
      text.setAttribute('y', height - 26);
      text.setAttribute('class', 'graph-axis-text graph-axis-text-bold');
      text.textContent = age === 0 ? 'Birth' : formatSubjectiveAge(age);
      this.group.appendChild(text);
      
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tick.setAttribute('x1', screenX);
      tick.setAttribute('y1', height - 40);
      tick.setAttribute('x2', screenX);
      tick.setAttribute('y2', height - 35);
      tick.style.stroke = '#fff';
      tick.style.strokeWidth = '1';
      this.group.appendChild(tick);
    }

    // Y Axis Labels
    const timeInterval = interval * 1000; 
    const worldTop = this.viewport.screenToWorld(0, 0).time;
    const worldBottom = this.viewport.screenToWorld(0, height).time;
    
    const startTime = Math.floor(Math.min(worldTop, worldBottom) / timeInterval) * timeInterval;
    const endTime = Math.max(worldTop, worldBottom);

    for (let time = startTime; time <= endTime; time += timeInterval) {
        const screenY = this.viewport.worldToScreen(0, time).y;
        if (screenY < 0 || screenY > height - 40) continue;

        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', 105);
        tick.setAttribute('y1', screenY);
        tick.setAttribute('x2', 110);
        tick.setAttribute('y2', screenY);
        tick.style.stroke = '#fff';
        tick.style.strokeWidth = '1';
        this.group.appendChild(tick);

        const dt = convertTimestampToDateString(time);
        
        // Multi-line Date
        const dateText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dateText.setAttribute('x', 30);
        dateText.setAttribute('y', screenY - 14);
        dateText.setAttribute('class', 'graph-axis-text graph-axis-text-bold');
        dateText.textContent = dt.date.split('T')[0];
        
        const timeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        timeText.setAttribute('x', 30);
        timeText.setAttribute('y', screenY - 2);
        timeText.setAttribute('class', 'graph-axis-text graph-axis-text-bold');
        timeText.textContent = dt.date.split('T')[1]?.substring(0,8) || dt.time;
        
        const dayText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dayText.setAttribute('x', 30);
        dayText.setAttribute('y', screenY + 10);
        dayText.setAttribute('class', 'graph-axis-text graph-axis-text-bold');
        const dayStr = new Date(time).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        dayText.textContent = dayStr;

        this.group.appendChild(dateText);
        this.group.appendChild(timeText);
        this.group.appendChild(dayText);
    }
  }

  getInterval(zoom) {
    if (zoom > 50) return SECONDS_IN_DAY;
    if (zoom > 10) return SECONDS_IN_DAY * 30;
    if (zoom > 1) return SECONDS_IN_YEAR;
    if (zoom > 0.1) return SECONDS_IN_YEAR * 10;
    return SECONDS_IN_YEAR * 50;
  }

  _createAxisGroup() {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'span-graph-axes');
    g.style.pointerEvents = 'none'; 
    return g;
  }
}
