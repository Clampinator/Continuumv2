
// continuum/modules/span-graph-interactions.js
import { getSheetContext } from './span-graph-state.js';
import { renderGraph } from './span-graph-render.js';
import { attachGoalListeners } from './span-graph-interactions-goals.js';
import { attachTooltipListeners } from './span-graph-interactions-tooltips.js';
import { handlePointerDown } from '/systems/continuum-v2/modules/lifeline/events/pointer-down-handler.js';
import { handlePointerMove } from '/systems/continuum-v2/modules/lifeline/events/pointer-move-handler.js';
import { handlePointerUp } from '/systems/continuum-v2/modules/lifeline/events/pointer-up-handler.js';
import { ContextMenuHandler } from './lifeline/handlers/context-menu-handler.js';

/**
 * Attaches all event listeners for graph interaction.
 * Uses jQuery namespacing to ensure clean re-initialization.
 */
export function attachGraphListeners(svg, sheet) {
    const { viewState, graphData } = getSheetContext(sheet);
    const $svg = $(svg);
    const html = sheet.element; 
    const wrapper = html.find('.span-graph-wrapper');
    const toggleBtn = html.find('.toggle-map-mode');

    // 1. CLEAR EXISTING LISTENERS
    // This is the most critical step to prevent multiple dialogs.
    $svg.off('.spanGraph');
    $(document).off('.spanGraphGlobal');

    // 2. Main Pointer Events (High frequency)
    // We use .on() with a namespace so we can .off() them reliably.
    // Only attach write-capable events when the current user owns this actor.
    const canEdit = sheet.actor.isOwner;

    if (canEdit) {
        $svg.on('pointerdown.spanGraph', (e) => {
            handlePointerDown(e.originalEvent || e, svg, sheet, viewState, graphData);
        });

        $svg.on('pointermove.spanGraph', (e) => {
            handlePointerMove(e.originalEvent || e, svg, viewState, graphData, sheet);
        });

        $svg.on('pointerup.spanGraph pointerleave.spanGraph', (e) => {
            handlePointerUp(e.originalEvent || e, svg, sheet, viewState, graphData);
        });

        // ISOLATED: Context Menu Listener
        $svg.on('contextmenu.spanGraph', (e) => {
            ContextMenuHandler.handle(e.originalEvent || e, sheet, viewState);
        });
    }

    // 3. Goal Interactions (owner only - goals are write operations)
    if (canEdit) {
        attachGoalListeners(html, svg, sheet, viewState, graphData);
    }

    // 4. Mouse Wheel Zoom
    $svg.on('wheel.spanGraph', (event) => {
        if (wrapper.hasClass('map-mode')) return;

        event.preventDefault();
        const originalEvent = event.originalEvent;
        const rect = svg.getBoundingClientRect();
        const mouseX = originalEvent.clientX - rect.left;
        const mouseY = originalEvent.clientY - rect.top;
        const zoomFactor = originalEvent.deltaY < 0 ? 1.1 : 0.9;
        
        const worldX = (mouseX - viewState.x) / viewState.scaleX;
        const worldY = (mouseY - viewState.y) / viewState.scaleY;
        
        viewState.scaleX *= zoomFactor;
        viewState.scaleY *= zoomFactor;
        viewState.x = mouseX - (worldX * viewState.scaleX);
        viewState.y = mouseY - (worldY * viewState.scaleY);
        
        requestAnimationFrame(() => renderGraph(svg, viewState, graphData));
    });

    // 5. Tooltip Interactions
    attachTooltipListeners(svg, graphData, sheet.actor);

    // 6. Spacebar Toggle for Native Map Interaction (Global document listener)
    const handleKeyDown = (e) => {
        if (e.key === ' ' && !e.repeat) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') return;
            if (wrapper.is(':hover')) {
                e.preventDefault();
                wrapper.addClass('map-mode');
                toggleBtn.addClass('active');
            }
        }
    };

    const handleKeyUp = (e) => {
        if (e.key === ' ') {
            wrapper.removeClass('map-mode');
            toggleBtn.removeClass('active');
        }
    };

    $(document).on('keydown.spanGraphGlobal', handleKeyDown);
    $(document).on('keyup.spanGraphGlobal', handleKeyUp);

    // 7. UI Toggle Button Listener
    toggleBtn.on('click.spanGraph', (e) => {
        e.preventDefault();
        wrapper.toggleClass('map-mode');
        toggleBtn.toggleClass('active');
    });
}
