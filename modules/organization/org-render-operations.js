const svgNS = "http://www.w3.org/2000/svg";

export function drawOperations(svg, width, height, viewState, graphData, labelLayer) {
    const layer = svg.querySelector('.graph-experiences-layer');
    if (!layer) return;
    layer.innerHTML = '';

    graphData.experienceSegments.forEach(op => {
        const startX = (op.startAge * viewState.scaleX) + viewState.x;
        const endX = (op.endAge * viewState.scaleX) + viewState.x;
        const y1 = (op.startTime * viewState.scaleY) + viewState.y;
        const y2 = (op.endTime * viewState.scaleY) + viewState.y;

        const rectY = Math.min(y1, y2);
        const rectH = Math.abs(y2 - y1);
        const rectX = startX;
        const rectW = Math.max(0, endX - startX);

        if (rectW > 0 && rectH > 0 && Number.isFinite(rectX) && Number.isFinite(rectY)) {
            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('x', rectX); rect.setAttribute('y', rectY);
            rect.setAttribute('width', rectW); rect.setAttribute('height', rectH);
            rect.classList.add('graph-experience-rect');

            if (op.isClosed) {
                rect.setAttribute('fill', 'rgba(255, 180, 0, 0.15)');
                rect.setAttribute('stroke', 'rgba(255, 180, 0, 0.3)');
            } else {
                rect.setAttribute('fill', 'url(#expFadeGradient)');
            }
            layer.appendChild(rect);

            if (rectW > 30 && rectH > 20 && labelLayer) {
                const label = document.createElementNS(svgNS, 'text');
                label.setAttribute('x', rectX + rectW / 2);
                label.setAttribute('y', rectY + 12);
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('fill', '#ffd700');
                label.setAttribute('font-size', '10px');
                label.classList.add('graph-exp-label', 'graph-label-clickable');
                label.setAttribute('data-id', op.expId);
                label.setAttribute('data-era-id', op.eraId);
                label.style.pointerEvents = 'all';
                label.style.cursor = 'pointer';
                label.textContent = op.name;
                labelLayer.appendChild(label);
            }
        }
    });
}
