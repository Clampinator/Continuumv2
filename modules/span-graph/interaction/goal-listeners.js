/**
 * INTERACTION: GOAL HUD LISTENERS
 * Handles hover (show connection lines), click (edit dialog), and drag-to-link
 * for goal chips in the span-graph HUD.
 *
 * Delegates to the viewport's _goalState for rendering and to Foundry actor
 * updates for data persistence.
 */
import { showCreateGoalDialog } from '../../span-graph-dialog-create-goal.js';
import { showEditGoalDialog } from '../../span-graph-ui-dialogs.js';
import { linkGoalToEvent } from '/systems/continuum-v2/modules/state/link-goal-to-event.js';

let _goalFadeTimeout = null;

/**
 * Attach all goal HUD event listeners.
 * @param {HTMLElement} html - The jQuery-wrapped sheet element.
 * @param {SpanGraphViewport} viewport - The viewport instance.
 */
export function attachGoalListeners(html, viewport) {
    const goalChips = html.find('.goal-hud-chip');
    const addBtn = html.find('.goal-hud-add');
    const svg = viewport.svg;

    // --- ADD GOAL BUTTON ---
    addBtn.off('click.goalHud').on('click.goalHud', (event) => {
        event.preventDefault();
        // Find the sheet from the viewport's actor
        const sheet = viewport.actor?.sheet;
        if (sheet) showCreateGoalDialog(sheet);
    });

    // --- HOVER: Show dotted connection lines ---
    goalChips.on('mouseenter.goalHud', (event) => {
        const chip = event.currentTarget;
        const goalId = chip.dataset.id;
        const importance = chip.dataset.importance || 'Important';

        // Clear any pending fade timeout
        if (_goalFadeTimeout) {
            clearTimeout(_goalFadeTimeout);
            _goalFadeTimeout = null;
        }

        // Calculate goal chip center position relative to SVG
        const svgRect = svg.getBoundingClientRect();
        const chipRect = chip.getBoundingClientRect();
        const goalScreenPos = {
            x: (chipRect.left + chipRect.width / 2) - svgRect.left,
            y: (chipRect.top + chipRect.height / 2) - svgRect.top
        };

        viewport._goalState = {
            goalId,
            goalScreenPos,
            goalImportance: importance,
            isFading: false
        };

        viewport._render();
    });

    goalChips.on('mouseleave.goalHud', () => {
        viewport._goalState = {
            ...viewport._goalState,
            isFading: true
        };
        viewport._render();

        // Fade out completely after CSS transition duration
        _goalFadeTimeout = setTimeout(() => {
            viewport._goalState = {
                goalId: null,
                goalScreenPos: null,
                goalImportance: null,
                isFading: false
            };
            _goalFadeTimeout = null;
            viewport._render();
        }, 300);
    });

    // --- DRAG: Drag goal chip to event node to link ---
    goalChips.on('pointerdown.goalHud', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const chip = event.currentTarget;
        const goalId = chip.dataset.id;
        const importance = chip.dataset.importance;
        const text = chip.querySelector('.goal-hud-text')?.textContent || '';
        const startX = event.clientX;
        const startY = event.clientY;
        let hasMoved = false;

        // Drag proxy element
        const dragProxy = document.getElementById('graph-drag-proxy');

        if (dragProxy) {
            dragProxy.style.display = 'flex';
            dragProxy.textContent = text;
            dragProxy.setAttribute('data-importance', importance);
            dragProxy.style.left = `${event.clientX}px`;
            dragProxy.style.top = `${event.clientY}px`;
        }

        // Highlight goal connections during drag
        const svgRect = svg.getBoundingClientRect();
        const chipRect = chip.getBoundingClientRect();
        viewport._goalState = {
            goalId,
            goalScreenPos: {
                x: (chipRect.left + chipRect.width / 2) - svgRect.left,
                y: (chipRect.top + chipRect.height / 2) - svgRect.top
            },
            goalImportance: importance,
            isFading: false
        };

        const moveHandler = (moveEvent) => {
            if (!hasMoved) {
                const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
                if (dist > 5) hasMoved = true;
            }

            if (dragProxy) {
                dragProxy.style.left = `${moveEvent.clientX}px`;
                dragProxy.style.top = `${moveEvent.clientY}px`;
            }

            // Update goal screen position as proxy moves
            viewport._goalState = {
                ...viewport._goalState,
                goalScreenPos: {
                    x: moveEvent.clientX - svgRect.left,
                    y: moveEvent.clientY - svgRect.top
                }
            };

            viewport._render();
        };

        const upHandler = async (upEvent) => {
            if (dragProxy) dragProxy.style.display = 'none';

            window.removeEventListener('pointermove', moveHandler);
            window.removeEventListener('pointerup', upHandler);

            // --- CLICK LOGIC: Open edit dialog ---
            if (!hasMoved) {
                const sheet = viewport.actor?.sheet;
                const goalData = viewport.actor?.system?.goals?.[goalId];
                if (sheet && goalData) {
                    showEditGoalDialog(sheet, goalId, goalData);
                }
                // Clear goal lines
                viewport._goalState = { goalId: null, goalScreenPos: null, goalImportance: null, isFading: false };
                viewport._render();
                return;
            }

            // --- DRAG DROP LOGIC: Link goal to node ---
            const mouseX = upEvent.clientX - svgRect.left;
            const mouseY = upEvent.clientY - svgRect.top;
            let droppedNode = null;

            // Hit test against manifest nodes
            if (mouseX >= 0 && mouseX <= svgRect.width && mouseY >= 0 && mouseY <= svgRect.height) {
                const manifest = viewport.latestManifest;
                if (manifest?.nodes) {
                    let minDist = 15; // hit radius in screen pixels
                    for (const node of manifest.nodes) {
                        if (node.id === 'now' || node.id === 'birth' || node.id === 'pending-node') continue;
                        if (node.isPreview) continue;
                        const dist = Math.hypot(mouseX - node.x, mouseY - node.y);
                        if (dist < minDist) {
                            minDist = dist;
                            droppedNode = node;
                        }
                    }
                }
            }

            if (droppedNode && viewport.actor) {
                const eraId = droppedNode.eraId;
                const expId = droppedNode.expId;
                const eventId = droppedNode.id;

                if (eraId && eventId) {
                    await linkGoalToEvent(viewport.actor, goalId, eraId, expId, eventId);
                }
            }

            // Clear goal lines after drop
            viewport._goalState = { goalId: null, goalScreenPos: null, goalImportance: null, isFading: false };
            viewport._render();
        };

        window.addEventListener('pointermove', moveHandler);
        window.addEventListener('pointerup', upHandler);
    });
}

/**
 * Remove all goal HUD event listeners.
 * @param {HTMLElement} html - The jQuery-wrapped sheet element.
 */
export function detachGoalListeners(html) {
    html.find('.goal-hud-chip').off('.goalHud');
    html.find('.goal-hud-add').off('.goalHud');
    if (_goalFadeTimeout) {
        clearTimeout(_goalFadeTimeout);
        _goalFadeTimeout = null;
    }
}