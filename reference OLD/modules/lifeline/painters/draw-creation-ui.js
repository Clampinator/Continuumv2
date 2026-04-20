/*
Renders the creation bars used to define new Eras.
Experience creation is now handled automatically via bounding boxes,
so the legacy gold bar has been removed.
*/
export function drawCreationUI(svgLayer, viewState, graphData) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = svgLayer.closest('svg');
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // 1. Creation Rect (The translucent box visible during drag)
    let dragRect = svgLayer.querySelector('.creation-drag-rect');
    if (!dragRect) {
        dragRect = document.createElementNS(svgNS, 'rect');
        dragRect.classList.add('creation-drag-rect');
        dragRect.style.display = 'none';
        svgLayer.appendChild(dragRect);
    }

    if (viewState.isDragging && (viewState.interactionMode === 'create-era')) {
        const sx = (viewState.creationStartAgeSeconds * viewState.scaleX) + viewState.x;
        const cx = (viewState.creationCurrentAgeSeconds * viewState.scaleX) + viewState.x;
        const x = Math.min(sx, cx);
        const w = Math.abs(cx - sx);
        
        dragRect.setAttribute('x', x);
        dragRect.setAttribute('y', 0);
        dragRect.setAttribute('width', w);
        dragRect.setAttribute('height', height - 20);
        dragRect.style.display = 'block';
    } else {
        dragRect.style.display = 'none';
    }

    // 2. Era Creation Bar (Bottom Blue Line)
    let ageBar = svgLayer.querySelector('.creation-bar-era');
    let ageLabel = svgLayer.querySelector('.creation-label-era');

    if (!ageBar) {
        ageBar = document.createElementNS(svgNS, 'rect');
        ageBar.classList.add('creation-bar-era');
        svgLayer.appendChild(ageBar);

        ageLabel = document.createElementNS(svgNS, 'text');
        ageLabel.classList.add('creation-label-era');
        ageLabel.textContent = "Create Era";
        svgLayer.appendChild(ageLabel);
    }

    ageBar.setAttribute('x', 0);
    ageBar.setAttribute('y', height - 20);
    ageBar.setAttribute('width', width);
    ageBar.setAttribute('height', 20);

    ageLabel.setAttribute('x', 5);
    ageLabel.setAttribute('y', height - 7);
}