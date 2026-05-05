const svgNS = "http://www.w3.org/2000/svg";

/**
 * Updates text labels and titles for the graph axes.
 * DUMB RENDERER: receives pre-formatted label strings from the caller,
 * not from TTL. The caller is responsible for formatting via TTL before
 * calling this function.
 *
 * @param {SVGElement} group
 * @param {number} width
 * @param {number} height
 * @param {object} viewState
 * @param {Array<{screenX: number, label: string}>} [axisLabels.ageLabels] - Pre-formatted age labels
 * @param {Array<{screenY: number, date: string, time: string}>} [axisLabels.timeLabels] - Pre-formatted time labels
 */
export function updateAxisLabels(group, width, height, viewState, axisLabels) {
    if (!group) return;

    // Label creation: happens once, then positions are updated each pass.
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
    if (!group.querySelector('.x-eventTitle')) {
        const xTitle = document.createElementNS(svgNS, 'text');
        xTitle.classList.add('graph-axis-eventTitle', 'x-eventTitle');
        xTitle.textContent = "SUBJECTIVE AGE";
        group.appendChild(xTitle);
    }
    if (!group.querySelector('.y-eventTitle')) {
        const yTitle = document.createElementNS(svgNS, 'text');
        yTitle.classList.add('graph-axis-eventTitle', 'y-eventTitle');
        yTitle.textContent = "OBJECTIVE DATE";
        group.appendChild(yTitle);
    }

    const xLabels = group.querySelectorAll('.x-axis-label');
    const yLabels = group.querySelectorAll('.y-axis-label');

    // X-AXIS: use pre-formatted labels if provided, otherwise fall back to raw coordinates
    if (axisLabels?.ageLabels) {
        xLabels.forEach((label, i) => {
            if (i >= axisLabels.ageLabels.length) return;
            const { screenX, label: text } = axisLabels.ageLabels[i];
            label.setAttribute('x', Math.min(width - 30, Math.max(30, screenX)));
            label.setAttribute('y', height - 25);
            label.textContent = text;
        });
    } else {
        // Fallback: use raw coordinate values (no formatting)
        xLabels.forEach((label, i) => {
            const screenX = (width / 5) * i;
            label.setAttribute('x', Math.min(width - 30, Math.max(30, screenX)));
            label.setAttribute('y', height - 25);
            label.textContent = `${Math.round(screenX)}`;
        });
    }

    // Y-AXIS: use pre-formatted labels if provided, otherwise fall back
    if (axisLabels?.timeLabels) {
        yLabels.forEach((label, i) => {
            if (i >= axisLabels.timeLabels.length) return;
            const { screenY, date, time } = axisLabels.timeLabels[i];
            const labelX = 15;
            label.setAttribute('x', labelX);
            label.setAttribute('y', Math.min(height - 15, Math.max(20, screenY)));
            label.innerHTML = '';
            const tspan1 = document.createElementNS(svgNS, 'tspan');
            tspan1.textContent = date;
            tspan1.setAttribute('x', labelX);
            label.appendChild(tspan1);
            const tspan2 = document.createElementNS(svgNS, 'tspan');
            tspan2.textContent = time;
            tspan2.setAttribute('x', labelX);
            tspan2.setAttribute('dy', '1.2em');
            label.appendChild(tspan2);
        });
    } else {
        yLabels.forEach((label, i) => {
            const screenY = ((height - 65) / 5) * i;
            label.setAttribute('x', 15);
            label.setAttribute('y', Math.min(height - 15, Math.max(20, screenY)));
            label.textContent = `${Math.round(screenY)}`;
        });
    }

    const xTitle = group.querySelector('.x-eventTitle');
    if (xTitle) {
        xTitle.setAttribute('x', width / 2);
        xTitle.setAttribute('y', height - 8);
    }
    const yTitle = group.querySelector('.y-eventTitle');
    if (yTitle) {
        yTitle.setAttribute('transform', `translate(5, ${height / 2}) rotate(-90)`);
    }
}