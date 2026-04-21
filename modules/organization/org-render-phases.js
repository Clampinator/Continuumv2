const svgNS = "http://www.w3.org/2000/svg";

export function drawPhases(svg, width, height, viewState, graphData, labelLayer) {
    const layer = svg.querySelector('.graph-ages-layer');
    if (!layer) return;
    layer.innerHTML = '';

    graphData.eras.forEach(phase => {
        const startX = (phase.startAgeSeconds * viewState.scaleX) + viewState.x;
        const endX = (phase.endAgeSeconds * viewState.scaleX) + viewState.x;
        const barWidth = Math.max(0, endX - startX);

        if (endX > 0 && startX < width) {
            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('x', startX); rect.setAttribute('y', 0);
            rect.setAttribute('width', barWidth); rect.setAttribute('height', height);
            rect.classList.add('graph-era-column');
            layer.appendChild(rect);

            if (barWidth > 40 && labelLayer) {
                const label = document.createElementNS(svgNS, 'text');
                label.setAttribute('x', startX + barWidth / 2);
                label.setAttribute('y', 15);
                label.classList.add('graph-era-label', 'graph-label-clickable');
                label.setAttribute('data-id', phase.id);
                label.setAttribute('data-type', 'era');
                label.style.pointerEvents = 'all';
                label.style.cursor = 'pointer';
                label.textContent = phase.name;
                labelLayer.appendChild(label);
            }
        }
    });
}
