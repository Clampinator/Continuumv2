import { getDragMode, constrainMovement } from '../../actions/drag-physics.js';
import { convertTimestampToDateString, formatSubjectiveAge, formatDuration } from '../../../span-graph-utils/provide-span-graph-utils.js';
import { calculateSpanPool } from '../../../lifeline/services/calculators/calculate-span-pool.js';

/**
 * Handles the pointermove event for the Span Graph.
 * ADI REBUILT: Consistent x/y coordinate isolation.
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
        
        if (viewport._interaction.type === 'node') {
            const isNowNode = viewport._interaction.nodeElement?.classList.contains('graph-node-now');
            const history = viewport._interaction.cachedHistory || [];
            const lastEvent = history[history.length - 1];
            const spanRank = viewport.actor.system.spanning?.span || 0;

            viewport._interaction.mode = getDragMode(dx, dy, { 
                isNow: isNowNode, 
                lastEvent: lastEvent,
                spanRank: spanRank 
            });
            viewport.viewState.interactionMode = 'drag-node';
        }
    }

    // 2. Perform Movement
    if (viewport._interaction.type === 'node') {
        const rawWorld = viewport.screenToWorld(x, y);
        const world = constrainMovement(rawWorld, viewport._interaction.startWorld, viewport._interaction.mode);
        viewport._interaction.currentWorld = world;
        
        // AUTHORITY: Real-time Dragging HUD
        _updateDragTooltip(viewport, x, y);

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
 * @private
 */
function _updateHoverTooltips(viewport, event, x, y) {
    const target = event.target;
    const node = target.closest('.graph-node-level, .graph-node-span-origin, .graph-node-span-dest, .graph-node-now');
    
    if (!node || !viewport.tooltipManager) {
        if (viewport.tooltipManager) viewport.tooltipManager.hide();
        return;
    }

    const history = viewport._interaction.cachedHistory || [];
    const eventId = node.dataset.eventId;
    const content = [];

    if (node.classList.contains('graph-node-now')) {
        const subjectiveNow = Number(viewport.actor.system.personal?.subjectiveNow) || 0;
        const objectiveNow = Number(viewport.actor.system.personal?.objectiveNow) || Date.now();
        const dt = convertTimestampToDateString(objectiveNow);
        
        content.push({ label: 'STATUS', value: 'NOW', color: '#ffd700' });
        content.push({ label: 'DATE', value: dt.date });
        content.push({ label: 'TIME', value: dt.time });
        content.push({ label: 'AGE', value: formatSubjectiveAge(subjectiveNow) });
    } 
    else {
        // ADI: Lookup node by ID from cached history pass
        const targetNode = history.find(n => n.id === eventId);
        if (targetNode) {
            const record = targetNode.record || targetNode;
            const dt = convertTimestampToDateString(targetNode.y || targetNode.time);
            
            if (record.isSpan) {
                const arrDT = convertTimestampToDateString(targetNode.arrivalY || targetNode.arrivalTime);
                const cost = Math.abs((targetNode.arrivalY || targetNode.arrivalTime) - (targetNode.y || targetNode.time)) / 1000;
                
                content.push({ label: 'SPAN', value: record.title || 'Span', color: '#ff00ff' });
                content.push({ label: 'DEPART', value: `${dt.date} ${dt.time}` });
                content.push({ label: 'ARRIVE', value: `${arrDT.date} ${arrDT.time}` });
                content.push({ label: 'SPENT', value: formatDuration(cost), color: '#ff6b6b' });
                content.push({ label: 'AGE', value: formatSubjectiveAge(targetNode.x) });
            } else {
                content.push({ label: 'EVENT', value: record.title || 'Unknown', color: '#4da6ff' });
                content.push({ label: 'DATE', value: dt.date });
                content.push({ label: 'TIME', value: dt.time });
                content.push({ label: 'AGE', value: formatSubjectiveAge(targetNode.x) });
                if (record.location) content.push({ label: 'LOCATION', value: record.location, color: '#8ecae6' });
            }
        }
    }

    if (content.length > 0) {
        viewport.tooltipManager.show(content, { x, y });
    }
}

/**
 * Updates tooltips during active dragging.
 * @private
 */
function _updateDragTooltip(viewport, x, y) {
    const world = viewport._interaction.currentWorld;
    const history = viewport._interaction.cachedHistory || [];
    const content = [];

    if (viewport._interaction.mode === 'level') {
        const dt = convertTimestampToDateString(world.time);
        content.push({ label: 'ACTION', value: 'LEVELING...', color: '#4da6ff' });
        content.push({ label: 'DATE', value: dt.date });
        content.push({ label: 'TIME', value: dt.time });
        content.push({ label: 'AGE', value: formatSubjectiveAge(world.age) });
    } 
    else if (viewport._interaction.mode === 'span') {
        const depDT = convertTimestampToDateString(viewport._interaction.startWorld.time);
        const arrDT = convertTimestampToDateString(world.time);
        const spent = Math.abs(world.time - viewport._interaction.startWorld.time) / 1000;
        
        // Calculate Pool
        const pool = calculateSpanPool(viewport.actor, history, { 
            departureTime: viewport._interaction.startWorld.time,
            arrivalTime: world.time
        });

        content.push({ label: 'ACTION', value: 'SPANNING...', color: '#ff00ff' });
        content.push({ label: 'AGE', value: formatSubjectiveAge(world.age) });
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
