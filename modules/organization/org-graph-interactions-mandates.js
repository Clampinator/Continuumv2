import { renderOrgGraph } from './org-render.js';

export function attachMandateListeners(html, svg, sheet, viewState, graphData) {
    const dragProxy = html.find('#graph-drag-proxy')[0];
    const mandateChips = html.find('.goal-hud-chip.mandate');

    mandateChips.on('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const chip = event.currentTarget;
        const mandateId = chip.dataset.id;
        const importance = chip.dataset.importance;
        const text = chip.querySelector('.goal-hud-text').textContent;

        const startX = event.clientX;
        const startY = event.clientY;
        let hasMoved = false;

        viewState.isDragging = true;
        viewState.interactionMode = 'drag-mandate';
        
        if (dragProxy) {
            dragProxy.style.display = 'flex';
            dragProxy.textContent = text;
            dragProxy.setAttribute('data-importance', importance);
            dragProxy.classList.add('mandate'); 
            dragProxy.style.left = `${event.clientX}px`;
            dragProxy.style.top = `${event.clientY}px`;
        }

        const moveHandler = (moveEvent) => {
            if (!hasMoved) {
                const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
                if (dist > 5) hasMoved = true;
            }

            if (dragProxy) {
                dragProxy.style.left = `${moveEvent.clientX}px`;
                dragProxy.style.top = `${moveEvent.clientY}px`;
            }
        };

        const upHandler = async (upEvent) => {
            viewState.isDragging = false;
            viewState.interactionMode = 'pan';
            
            if (dragProxy) {
                dragProxy.style.display = 'none';
                dragProxy.classList.remove('mandate');
            }
            
            window.removeEventListener('pointermove', moveHandler);
            window.removeEventListener('pointerup', upHandler);

            // Drag -> Drop Logic (Link to Node)
            const svgRect = svg.getBoundingClientRect();
            const mouseX = upEvent.clientX - svgRect.left;
            const mouseY = upEvent.clientY - svgRect.top;
            
            let droppedNode = null;
            let minDist = 15;
            
            if (mouseX >= 0 && mouseX <= svgRect.width && mouseY >= 0 && mouseY <= svgRect.height) {
                Object.values(graphData.tracks).forEach(track => {
                    // Check nodes + head
                    const points = [...track.nodes];
                    if (track.headNode) points.push(track.headNode);

                    points.forEach(node => {
                        const nx = (node.age * viewState.scaleX) + viewState.x;
                        const ny = (node.time * viewState.scaleY) + viewState.y;
                        const dist = Math.sqrt(Math.pow(mouseX - nx, 2) + Math.pow(mouseY - ny, 2));
                        if (dist < minDist) {
                            minDist = dist;
                            droppedNode = node;
                        }
                    });
                });
            }

            if (droppedNode) {
                ui.notifications.info(game.i18n.format("CONTINUUM.Notifications.MandateLinked", {nodeTitle: droppedNode.eventTitle || "Unit Status"}));
                // Actual data linking requires Unit History implementation.
            }
            
            renderOrgGraph(svg, viewState, graphData);
        };

        window.addEventListener('pointermove', moveHandler);
        window.addEventListener('pointerup', upHandler);
    });
}
