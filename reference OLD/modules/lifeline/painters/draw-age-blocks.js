/*
Renders Era background columns and labels on the SVG layer.
*/
export function drawAgeBlocks(svgLayer, viewState, graphData) {
    const svgNS = "http://www.w3.org/2000/svg";
    svgLayer.innerHTML = '';

    if (!graphData.eras || graphData.eras.length === 0) return;

    const svg = svgLayer.closest('svg');
    const height = svg ? svg.getBoundingClientRect().height : 500;

    graphData.eras.forEach(era => {
        const x1 = (era.startAgeSeconds * viewState.scaleX) + viewState.x;
        const x2 = (era.endAgeSeconds * viewState.scaleX) + viewState.x;
        const w = x2 - x1;

        // NAN GUARD
        if (isNaN(x1) || isNaN(w)) return;
        if (w < 1) return;

        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', x1);
        rect.setAttribute('y', 0);
        rect.setAttribute('width', w);
        rect.setAttribute('height', height);
        rect.classList.add('graph-era-column');
        svgLayer.appendChild(rect);

        const label = document.createElementNS(svgNS, 'text');
        label.setAttribute('x', x1 + w/2);
        label.setAttribute('y', 15);
        label.classList.add('graph-era-label');
        label.setAttribute('data-id', era.id);
        label.textContent = era.name || "Era";
        svgLayer.appendChild(label);
    });
}