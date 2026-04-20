import { formatSubjectiveAge, formatObjectiveDate } from '../../../span-graph-utils.js';

const svgNS = "http://www.w3.org/2000/svg";

/**
 * Updates text labels and titles for the graph axes.
 * @param {SVGElement} group 
 * @param {number} width 
 * @param {number} height 
 * @param {object} viewState 
 */
export function updateAxisLabels(group, width, height, viewState) {
    if (!group) return;

    if (group.querySelectorAll('.x-axis-label').length === 0) {
        for (let i = 0; i < 6; i++) {
            const text = document.createElementNS(svgNS, 'text');
            text.classList.add('x-axis-label');
            group.appendChild(text);
        }
    }
    if (group.querySelectorAll('.y-axis-label').length === 0) {
        for (let i = 0; i < 6; i++) {
            const text = document.createElementNS(svgNS, 'text');
            text.classList.add('y-axis-label');
            group.appendChild(text);
        }
    }
    if (!group.querySelector('.x-title')) {
        const xTitle = document.createElementNS(svgNS, 'text');
        xTitle.classList.add('graph-axis-title', 'x-title');
        xTitle.textContent = "SUBJECTIVE AGE";
        group.appendChild(xTitle);
    }
    if (!group.querySelector('.y-title')) {
        const yTitle = document.createElementNS(svgNS, 'text');
        yTitle.classList.add('graph-axis-title', 'y-title');
        yTitle.textContent = "OBJECTIVE DATE";
        group.appendChild(yTitle);
    }

    const xLabels = group.querySelectorAll('.x-axis-label');
    const yLabels = group.querySelectorAll('.y-axis-label');

    xLabels.forEach((label, i) => {
        const screenX = (width / 5) * i; 
        const ageSeconds = (screenX - viewState.x) / viewState.scaleX;
        label.setAttribute('x', Math.min(width - 30, Math.max(30, screenX))); 
        label.setAttribute('y', height - 25); 
        label.textContent = formatSubjectiveAge(ageSeconds);
    });

    yLabels.forEach((label, i) => {
        const screenY = ((height - 65) / 5) * i;
        const timestamp = (screenY - viewState.y) / viewState.scaleY;
        const dateLines = formatObjectiveDate(timestamp);
        const labelX = 22;
        label.setAttribute('x', labelX);
        label.setAttribute('y', Math.min(height - 15, Math.max(20, screenY)));
        label.innerHTML = '';
        dateLines.forEach((line, lineIndex) => {
            const tspan = document.createElementNS(svgNS, 'tspan');
            tspan.textContent = line;
            tspan.setAttribute('x', labelX);
            tspan.setAttribute('dy', lineIndex === 0 ? 0 : '1.2em');
            label.appendChild(tspan);
        });
    });

    const xTitle = group.querySelector('.x-title');
    if (xTitle) {
        xTitle.setAttribute('x', width / 2);
        xTitle.setAttribute('y', height - 33);
    }
    const yTitle = group.querySelector('.y-title');
    if (yTitle) {
        yTitle.setAttribute('transform', `translate(10, ${height / 2}) rotate(-90)`);
    }
}