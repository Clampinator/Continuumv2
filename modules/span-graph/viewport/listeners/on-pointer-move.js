import { getDragMode, constrainMovement } from '/systems/continuum-v2/modules/temporal-kernel/drag-physics.js';
import { convertTimestampToDateString, formatSubjectiveAge, formatDuration } from '/systems/continuum-v2/modules/span-graph-utils/provide-span-graph-utils.js';
import { calculateSpanPool } from '/systems/continuum-v2/modules/lifeline/services/calculators/calculate-span-pool.js';
import { findLastKnownLocation } from '/systems/continuum-v2/modules/lifeline/services/context-finder/find-last-known-location.js';

/**
 * Handles the pointermove event for the Span Graph.
 * DEEP DECIMATION REBUILT: Consistent x/y coordinate isolation.
 */
export function onPointerMove(event, viewport) {
    const rect = viewport.svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (!viewport._interaction.isDragging) {
        // AUTHORITY: Static Hover HUD
        _updateHoverTooltips(viewport, event, x, y);
        viewport._updateGhostNodeHover(x, y);
        return;
    }

    const dx = x - viewport._interaction.startX;
    const dy = y - viewport._interaction.startY;

    // 1. Resolve Move Mode (Threshold Gate)
    if (!viewport._interaction.hasSignificantMovement) {
        if (Math.hypot(dx, dy) < 5) return;
        viewport._interaction.hasSignificantMovement = true;
        viewport.viewState.interactionMode = 'drag-node';
    }

    // 2. Perform Movement
    if (viewport._interaction.type === 'node') {
        const isNowNode = viewport._interaction.nodeElement?.classList.contains('graph-node-now');
        
        // AUTHORITY: Recalculate mode on every frame for NOW node to allow smooth axis transitions.
        if (isNowNode) {
            const history = viewport.latestHistory || [];
            const lastEvent = history[history.length - 1];
            const spanRank = viewport.actor.system.spanning?.span || 0;
            
            viewport._interaction.mode = getDragMode(dx, dy, { 
                isNow: true, 
                lastEvent: lastEvent,
                spanRank: spanRank 
            });
        } else if (!viewport._interaction.mode) {
            // Standard nodes lock their mode after the initial threshold.
            viewport._interaction.mode = getDragMode(dx, dy);
        }

        const rawWorld = viewport.screenToWorld(x, y);
        const world = constrainMovement(rawWorld, viewport._interaction.startWorld, viewport._interaction.mode);
        viewport._interaction.currentWorld = world;
        
        // AUTHORITY: Real-time Dragging HUD
        _updateDragTooltip(viewport, x, y);

        // AUTHORITY: The _render pass now handles drag overrides correctly via the viewport's state machine.
        viewport._render();
        
    } else if (viewport._interaction.type === 'pan') {
        const newPan = {
            panX: viewport._interaction.startPanX + dx,
            panY: viewport._interaction.startPanY + dy
        };
        viewport.setViewState(newPan);
    }
}

/**
 * Updates tooltips during static hover.
 */
function _updateHoverTooltips(viewport, event, x, y) {
    const target = event.target;
    const node = target.closest('.graph-node-level, .graph-node-span-origin, .graph-node-span-dest, .graph-node-now');
    
    if (!node || !viewport.tooltipManager) {
        if (viewport.tooltipManager) viewport.tooltipManager.hide();
        return;
    }

    const history = viewport.latestHistory || [];
    const state = viewport.latestState;
    if (!state) return;

    const eventId = node.dataset.eventId;
    const content = [];

    if (node.classList.contains('graph-node-now')) {
        const nowNode = state.nowNode;
        const dt = convertTimestampToDateString(nowNode.y);
        const location = findLastKnownLocation(history, nowNode.x);
        
        content.push({ label: 'STATUS', value: 'NOW', color: '#ffd700' });
        content.push({ label: 'DATE', value: dt.date });
        content.push({ label: 'TIME', value: dt.time });
        content.push({ label: 'AGE', value: formatSubjectiveAge(nowNode.x) });
        content.push({ label: 'LOCATION', value: location, color: '#8ecae6' });
    } 
    else {
        const targetNode = history.find(n => n.id === eventId);
        if (targetNode) {
            const record = targetNode.record || targetNode;
            const dt = convertTimestampToDateString(targetNode.y);
            
            if (record.eventIsSpan) {
                const arrDT = convertTimestampToDateString(targetNode.arrivalY);
                const cost = Math.abs(targetNode.arrivalY - targetNode.y) / 1000;
                
                content.push({ label: 'SPAN', value: record.eventTitle || 'Span', color: '#ff00ff' });
                content.push({ label: 'DEPART', value: `${dt.date} ${dt.time}` });
                content.push({ label: 'ARRIVE', value: `${arrDT.date} ${arrDT.time}` });
                content.push({ label: 'SPENT', value: formatDuration(cost), color: '#ff6b6b' });
                content.push({ label: 'AGE', value: formatSubjectiveAge(targetNode.x) });
                if (record.eventSpanFromLocation) content.push({ label: 'FROM', value: record.eventSpanFromLocation });
                if (record.eventSpanToLocation) content.push({ label: 'TO', value: record.eventSpanToLocation });
            } else {
                content.push({ label: 'EVENT', value: record.eventTitle || 'Unknown', color: '#4da6ff' });
                content.push({ label: 'DATE', value: dt.date });
                content.push({ label: 'TIME', value: dt.time });
                content.push({ label: 'AGE', value: formatSubjectiveAge(targetNode.x) });
                if (record.eventLocation) content.push({ label: 'LOCATION', value: record.eventLocation, color: '#8ecae6' });
            }
        }
    }

    if (content.length > 0) {
        viewport.tooltipManager.show(content, { x, y });
    }
}

/**
 * Updates tooltips during active dragging.
 */
function _updateDragTooltip(viewport, x, y) {
    const world = viewport._interaction.currentWorld;
    const history = viewport.latestHistory || [];
    const content = [];

    if (viewport._interaction.mode === 'level') {
        const dt = convertTimestampToDateString(world.eventTime);
        content.push({ label: 'ACTION', value: 'LEVELING...', color: '#4da6ff' });
        content.push({ label: 'DATE', value: dt.date });
        content.push({ label: 'TIME', value: dt.time });
        content.push({ label: 'AGE', value: formatSubjectiveAge(world.eventAge) });
    } 
    else if (viewport._interaction.mode === 'span') {
        const depDT = convertTimestampToDateString(viewport._interaction.startWorld.eventTime);
        const arrDT = convertTimestampToDateString(world.eventTime);
        const spent = Math.abs(world.eventTime - viewport._interaction.startWorld.eventTime) / 1000;
        
        const pool = calculateSpanPool(viewport.actor, history, { 
            departureTime: viewport._interaction.startWorld.eventTime,
            arrivalTime: world.eventTime
        });

        content.push({ label: 'ACTION', value: 'SPANNING...', color: '#ff00ff' });
        content.push({ label: 'AGE', value: formatSubjectiveAge(world.eventAge) });
        content.push({ label: 'DEPART', value: depDT.date });
        content.push({ label: 'NOW', value: arrDT.date });
        content.push({ label: 'SPENT', value: formatDuration(spent) });
        content.push({ 
            label: 'REMAINING', 
            value: formatDuration(pool.remaining / 1000),
            color: pool.remaining < 0 ? '#ff0000' : '#28a745'
        });
    }

    viewport.tooltipManager.show(content, { x, y });
}
