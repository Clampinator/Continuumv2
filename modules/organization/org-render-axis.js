import { formatSubjectiveAgeSmart, formatObjectiveDateSmart } from '../temporal-translator/smart-formatters.js';

const svgNS = "http://www.w3.org/2000/svg";

export function updateAxisLabels(group, width, height, viewState) {
    if (!group) return;
    group.innerHTML = '';

    // Backgrounds
    const yAxisBg = document.createElementNS(svgNS, 'rect');
    yAxisBg.setAttribute('x', 0); yAxisBg.setAttribute('y', 0);
    yAxisBg.setAttribute('width', 50); yAxisBg.setAttribute('height', height);
    yAxisBg.setAttribute('fill', 'rgba(0,0,0,0.5)');
    group.appendChild(yAxisBg);

    const xAxisBg = document.createElementNS(svgNS, 'rect');
    xAxisBg.setAttribute('x', 0); xAxisBg.setAttribute('y', height - 30);
    xAxisBg.setAttribute('width', width); xAxisBg.setAttribute('height', 30);
    xAxisBg.setAttribute('fill', 'rgba(0,0,0,0.5)');
    group.appendChild(xAxisBg);

    // X Labels (Subjective Age)
    const visibleAgeRange = width / viewState.scaleX;
    const numXLabels = 6;
    for (let i = 0; i < numXLabels; i++) {
        const x = (width / (numXLabels - 1)) * i;
        const worldAge = (x - viewState.x) / viewState.scaleX;

        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', Math.min(width - 10, Math.max(10, x)));
        text.setAttribute('y', height - 10);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#aaa');
        text.setAttribute('font-size', '11px');
        text.textContent = formatSubjectiveAgeSmart(worldAge, visibleAgeRange);
        group.appendChild(text);
    }

    // Y Labels (Objective Date)
    const visibleTimeRange = height / Math.abs(viewState.scaleY);
    const numYLabels = 6;
    for (let i = 0; i < numYLabels; i++) {
        const y = (height / (numYLabels - 1)) * i;
        const worldTime = (y - viewState.y) / viewState.scaleY;
        const lines = formatObjectiveDateSmart(worldTime, visibleTimeRange);

        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', 25);
        text.setAttribute('y', Math.min(height - 10, Math.max(15, y)));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#aaa');
        text.setAttribute('font-size', '11px');

        lines.forEach((l, idx) => {
            const tspan = document.createElementNS(svgNS, 'tspan');
            tspan.textContent = l;
            tspan.setAttribute('x', 25);
            tspan.setAttribute('dy', idx === 0 ? 0 : '1.1em');
            text.appendChild(tspan);
        });
        group.appendChild(text);
    }
}
