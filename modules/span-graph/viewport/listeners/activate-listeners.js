import { handleZoom } from '../actions/handle-zoom.js';

/**
 * HUD: ACTIVATE LISTENERS
 * Delegator for the Interaction Machine and Viewport controls.
 * Stores handler references on the viewport so they can be removed in destroy().
 */
export function activateListeners(viewport) {
    if (!viewport.svg) return;

    // CLEANUP: Remove any previous listeners before adding new ones
    // (safety net in case destroy was not called)
    deactivateListeners(viewport);

    // --- THE INTERACTION MACHINE (Pointer Machine) ---
    viewport._onPointerDown = (e) => {
        const rect = viewport.svg.getBoundingClientRect();
        viewport.pointerMachine.onDown(e, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    viewport.svg.addEventListener('pointerdown', viewport._onPointerDown);

    // WINDOW-LEVEL LISTENERS: These must be removable to prevent leak.
    // Without birth data the viewport is destroyed, so these must be detachable.
    viewport._onPointerMove = (e) => {
        // Silently skip if the viewport has been destroyed or SVG is detached.
        // getBoundingClientRect on a detached element returns all zeros,
        // which would produce meaningless world coordinates.
        if (!viewport.svg.isConnected) return;
        const rect = viewport.svg.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        viewport.pointerMachine.onMove(e, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    viewport._onPointerUp = (e) => {
        if (!viewport.svg.isConnected) return;
        const rect = viewport.svg.getBoundingClientRect();
        viewport.pointerMachine.onUp(e, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    window.addEventListener('pointermove', viewport._onPointerMove);
    window.addEventListener('pointerup', viewport._onPointerUp);

    // --- VIEWPORT CONTROLS (Zoom/Pan) ---
    viewport._onWheel = (event) => {
        event.preventDefault();
        const factor = event.deltaY > 0 ? 0.8 : 1.25;
        const rect = viewport.container.getBoundingClientRect();
        
        const updates = handleZoom(viewport.viewState, factor, { 
            x: event.clientX - rect.left, 
            y: event.clientY - rect.top 
        });
        viewport.setViewState(updates);
    };
    viewport.svg.addEventListener('wheel', viewport._onWheel, { passive: false });

    // --- CONTEXT MENU (Editing) ---
    viewport._onContextMenu = (e) => {
        e.preventDefault();
        const rect = viewport.svg.getBoundingClientRect();
        viewport.pointerMachine.onRightClick(e, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    viewport.svg.addEventListener('contextmenu', viewport._onContextMenu);

    // --- ERA LABEL DOUBLE-CLICK (Center viewport on era) ---
    viewport._onEraDblClick = (e) => {
        const eraLabel = e.target.closest('.graph-era-label');
        if (!eraLabel) return;
        e.preventDefault();
        const eraId = eraLabel.getAttribute('data-id');
        if (!eraId || !viewport.latestState?.eras) return;
        const era = viewport.latestState.eras.find(er => er.id === eraId);
        if (!era) return;
        const midAge = era.endAge === Infinity
            ? era.startAge + (era.duration || 0) / 2
            : era.startAge + (era.duration || 0) / 2;
        viewport.centerOnAge(midAge);
    };
    viewport.svg.addEventListener('dblclick', viewport._onEraDblClick);

    // --- DOUBLE-CLICK (Yet creation) ---
    // Double-click on empty space right of NOW creates a new Yet.
    // Era label handler runs first; if it consumed the event, this is a no-op.
    viewport._onYetDblClick = (e) => {
        if (e.target.closest('.graph-era-label')) return;
        const rect = viewport.svg.getBoundingClientRect();
        viewport.pointerMachine.onDoubleClick(e, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    viewport.svg.addEventListener('dblclick', viewport._onYetDblClick);
}

/**
 * Remove all event listeners previously attached by activateListeners.
 * Prevents window-level listener leak when the viewport is destroyed.
 */
export function deactivateListeners(viewport) {
    if (!viewport.svg) return;

    // SVG-level listeners
    if (viewport._onPointerDown) viewport.svg.removeEventListener('pointerdown', viewport._onPointerDown);
    if (viewport._onWheel) viewport.svg.removeEventListener('wheel', viewport._onWheel);
    if (viewport._onContextMenu) viewport.svg.removeEventListener('contextmenu', viewport._onContextMenu);
    if (viewport._onEraDblClick) viewport.svg.removeEventListener('dblclick', viewport._onEraDblClick);
    if (viewport._onYetDblClick) viewport.svg.removeEventListener('dblclick', viewport._onYetDblClick);

    // Window-level listeners (most critical to remove - these fire on every pointer event)
    if (viewport._onPointerMove) window.removeEventListener('pointermove', viewport._onPointerMove);
    if (viewport._onPointerUp) window.removeEventListener('pointerup', viewport._onPointerUp);
}