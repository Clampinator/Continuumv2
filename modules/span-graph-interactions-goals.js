
import { renderGraph } from './span-graph-render.js';
import { showEditGoalDialog } from './span-graph-ui-dialogs.js';

export function attachGoalListeners(html, svg, sheet, viewState, graphData) {
    const dragProxy = html.find('#graph-drag-proxy')[0];
    const goalChips = html.find('.goal-hud-chip');

    // --- HOVER LISTENERS FOR CONNECTIONS ---
    goalChips.on('mouseenter', (event) => {
        const chip = event.currentTarget;
        const goalId = chip.dataset.id;
        
        // Clear any existing fade timeout
        if (viewState.goalFadeTimeout) {
            clearTimeout(viewState.goalFadeTimeout);
            viewState.goalFadeTimeout = null;
        }

        viewState.highlightedGoalId = goalId;
        viewState.hoveredGoalRect = chip.getBoundingClientRect();
        viewState.isGoalLineFading = false;
        
        requestAnimationFrame(() => renderGraph(svg, viewState, graphData));
    });

    goalChips.on('mouseleave', (event) => {
        viewState.isGoalLineFading = true;
        requestAnimationFrame(() => renderGraph(svg, viewState, graphData));

        // Set timeout to clear the lines completely after the fade
        viewState.goalFadeTimeout = setTimeout(() => {
            viewState.highlightedGoalId = null;
            viewState.hoveredGoalRect = null;
            viewState.isGoalLineFading = false;
            viewState.goalFadeTimeout = null;
            requestAnimationFrame(() => renderGraph(svg, viewState, graphData));
        }, 3000); // 2s delay + 1s fade defined in CSS
    });

    // --- DRAG LISTENERS ---
    goalChips.on('pointerdown', (event) => {
        // Prevent default drag behavior to use our custom logic
        event.preventDefault();
        event.stopPropagation();

        const chip = event.currentTarget;
        const goalId = chip.dataset.id;
        const importance = chip.dataset.importance;
        const text = chip.querySelector('.goal-hud-text').textContent;

        // Record initial position to detect click vs drag
        const startX = event.clientX;
        const startY = event.clientY;
        let hasMoved = false;

        viewState.isDragging = true;
        viewState.interactionMode = 'drag-goal';
        viewState.activeDragType = 'goal';
        viewState.draggedGoalId = goalId;
        
        // Initialize Proxy
        if (dragProxy) {
            dragProxy.style.display = 'flex';
            dragProxy.textContent = text;
            dragProxy.setAttribute('data-importance', importance);
            // Position initially at pointer
            dragProxy.style.left = `${event.clientX}px`;
            dragProxy.style.top = `${event.clientY}px`;
        }

        // Add Global Listeners for dragging outside the chip
        const moveHandler = (moveEvent) => {
            // Check threshold for "Move"
            if (!hasMoved) {
                const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
                if (dist > 5) hasMoved = true;
            }

            if (dragProxy) {
                dragProxy.style.left = `${moveEvent.clientX}px`;
                dragProxy.style.top = `${moveEvent.clientY}px`;
            }
            
            // Convert to SVG coordinates for highlight logic
            const svgRect = svg.getBoundingClientRect();
            viewState.dragCurrentX = moveEvent.clientX - svgRect.left;
            viewState.dragCurrentY = moveEvent.clientY - svgRect.top;
            
            // Trigger graph redraw to show highlighting on nodes
            requestAnimationFrame(() => renderGraph(svg, viewState, graphData));
        };

        const upHandler = async (upEvent) => {
            viewState.isDragging = false;
            viewState.interactionMode = 'pan';
            
            if (dragProxy) dragProxy.style.display = 'none';
            
            // Cleanup listeners
            window.removeEventListener('pointermove', moveHandler);
            window.removeEventListener('pointerup', upHandler);

            // --- CLICK LOGIC: Edit Dialog ---
            if (!hasMoved) {
                const goalData = sheet.actor.system.goals[goalId];
                if (goalData) {
                    showEditGoalDialog(sheet, goalId, goalData);
                }
                renderGraph(svg, viewState, graphData); // Clear highlights
                return;
            }

            // --- DRAG DROP LOGIC ---
            // Check for drop on SVG Node
            const svgRect = svg.getBoundingClientRect();
            const mouseX = upEvent.clientX - svgRect.left;
            const mouseY = upEvent.clientY - svgRect.top;
            
            // Simple hit detection against visible nodes
            let droppedNode = null;
            let minDist = 15; // Hit radius
            
            // Only check if we are actually over the SVG
            if (mouseX >= 0 && mouseX <= svgRect.width && mouseY >= 0 && mouseY <= svgRect.height) {
                for (let i = graphData.levelNodes.length - 1; i >= 0; i--) {
                    const node = graphData.levelNodes[i];
                    const nx = (node.age * viewState.scaleX) + viewState.x;
                    const ny = (node.time * viewState.scaleY) + viewState.y;
                    const dist = Math.sqrt(Math.pow(mouseX - nx, 2) + Math.pow(mouseY - ny, 2));
                    if (dist < minDist) {
                        minDist = dist;
                        droppedNode = node;
                    }
                }
            }

            if (droppedNode && droppedNode.eraId && droppedNode.eventId) {
                // Build the correct data path depending on whether the event lives inside
                // an experience or directly under an era (expId may be null).
                let eventData, eventPath, legacyPath;
                if (droppedNode.expId) {
                    eventData = sheet.actor.system.eras[droppedNode.eraId].experiences[droppedNode.expId].events[droppedNode.eventId];
                    eventPath = `system.eras.${droppedNode.eraId}.experiences.${droppedNode.expId}.events.${droppedNode.eventId}.linkedGoalIds`;
                    legacyPath = `system.eras.${droppedNode.eraId}.experiences.${droppedNode.expId}.events.${droppedNode.eventId}.linkedGoalId`;
                } else {
                    eventData = sheet.actor.system.eras[droppedNode.eraId].events[droppedNode.eventId];
                    eventPath = `system.eras.${droppedNode.eraId}.events.${droppedNode.eventId}.linkedGoalIds`;
                    legacyPath = `system.eras.${droppedNode.eraId}.events.${droppedNode.eventId}.linkedGoalId`;
                }

                // RESTORATION: Get existing IDs and append new one if unique
                const existingGoals = eventData.linkedGoalIds || [];
                // Migration support: also check legacy linkedGoalId
                if (eventData.linkedGoalId) existingGoals.push(eventData.linkedGoalId);

                if (!existingGoals.includes(goalId)) {
                    const updatedGoals = [...new Set([...existingGoals, goalId])];
                    await sheet.actor.update({
                        [eventPath]: updatedGoals,
                        [legacyPath]: null
                    });
                    ui.notifications.info(game.i18n.localize("CONTINUUM.Notifications.GoalLinkedToEvent"));
                }
            } else {
                // Just clear highlights
                renderGraph(svg, viewState, graphData);
            }
        };

        window.addEventListener('pointermove', moveHandler);
        window.addEventListener('pointerup', upHandler);
    });
}
