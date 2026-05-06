import { getDragMode, constrainMovement } from '/systems/continuum-v2/modules/temporal-kernel/drag-physics.js';
import { computeSpanCost, computePoolAfterSpan } from '/systems/continuum-v2/modules/temporal-kernel/calculate-span-pool.js';
import { timestampToDateString, parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { formatSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { formatDurationCompact } from '/systems/continuum-v2/modules/temporal-translator/duration-converter.js';
import { findLastKnownLocation } from '/systems/continuum-v2/modules/lifeline/services/context-finder/find-last-known-location.js';

/**
 * Handles the pointermove event for the Span Graph.
 * Trinity: No span pool math here. All computation delegated to Kernel.
 * This file only converts Kernel output to tooltip display values.
 */
export function onPointerMove(event, viewport) {
    const rect = viewport.svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (!viewport._interaction.isDragging) {
        _updateHoverTooltips(viewport, event, x, y);
        viewport._updateGhostNodeHover(x, y);
        return;
    }

    const dx = x - viewport._interaction.startX;
    const dy = y - viewport._interaction.startY;

    if (!viewport._interaction.hasSignificantMovement) {
        if (Math.hypot(dx, dy) < 5) return;
        viewport._interaction.hasSignificantMovement = true;
        if (viewport._interaction.type === 'node') {
            viewport.viewState.interactionMode = 'drag-node';
        }
    }

    if (viewport._interaction.type === 'create-era') {
        const rawWorld = viewport.screenToWorld(x, y);
        const startAge = viewport._interaction.startWorld?.eventAge || 0;
        viewport._interaction.currentWorld = {
            eventAge: Math.max(rawWorld.eventAge, startAge),
            eventTime: 0
        };
        viewport._render();
    } else if (viewport._interaction.type === 'node') {
        const isNowNode = viewport._interaction.nodeElement?.classList.contains('graph-node-now');
        
        if (isNowNode) {
            const physicsNodes = viewport.latestState?.nodes || [];
            const lastPhysics = physicsNodes[physicsNodes.length - 1];
            const spanRank = viewport.actor.system.spanning?.span || 0;
            
            viewport._interaction.mode = getDragMode(dx, dy, { 
                isNow: true, 
                lastEvent: lastPhysics,
                spanRank: spanRank 
            });
        } else if (!viewport._interaction.mode) {
            viewport._interaction.mode = getDragMode(dx, dy);
        }

        const rawWorld = viewport.screenToWorld(x, y);
        const world = constrainMovement(rawWorld, viewport._interaction.startWorld, viewport._interaction.mode);
        viewport._interaction.currentWorld = world;
        
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
 * DATA FLOW: Physics nodes (state.nodes) have x/y/arrivalY coordinates.
 * Raw facts (latestHistory) have record fields (titles, locations, etc).
 * We use state.nodes for coordinate calculations and latestHistory
 * for display strings like eventTitle and eventLocation.
 */
function _updateHoverTooltips(viewport, event, x, y) {
    const target = event.target;
    const node = target.closest('.graph-node-level, .graph-node-span-origin, .graph-node-span-dest, .graph-node-now');
    
    if (!node || !viewport.tooltipManager) {
        if (viewport.tooltipManager) viewport.tooltipManager.hide();
        return;
    }

    const state = viewport.latestState;
    if (!state) return;

    const physicsNodes = state.nodes || [];
    const eventId = node.dataset.eventId;
    const content = [];

    if (node.classList.contains('graph-node-now')) {
        const nowNode = state.nowNode;
        if (!nowNode) return;
        const history = viewport.latestHistory || [];
        const dt = timestampToDateString(nowNode.y);
        const location = findLastKnownLocation(history, nowNode.x);
        
        content.push({ label: 'STATUS', value: 'NOW', color: '#ffd700' });
        content.push({ label: 'DATE', value: dt.date });
        content.push({ label: 'TIME', value: dt.time });
        content.push({ label: 'AGE', value: formatSubjectiveAge(nowNode.x) });
        content.push({ label: 'LOCATION', value: location, color: '#8ecae6' });
    } 
    else if (node.classList.contains('graph-node-span-dest')) {
        // SPAN DEST (ARRIVAL) NODE: Look up the span-origin via manifest link.
        // Manifest nodes carry arrivalY/worldY/worldX for origin nodes
        // and spanOriginId for dest nodes.
        const manifestNodes = viewport.latestManifest?.nodes || [];
        const destManifest = manifestNodes.find(n => n.id === eventId);
        const originId = destManifest?.spanOriginId;
        
        if (originId) {
            const originManifest = manifestNodes.find(n => n.id === originId);
            if (originManifest) {
                const originRecord = originManifest.record || {};
                // World coordinates from the manifest span-origin enrichment
                const departureWorld = originManifest.worldY || 0;
                const arrivalWorld = originManifest.arrivalY || departureWorld;
                const depDT = timestampToDateString(departureWorld);
                const arrDT = timestampToDateString(arrivalWorld);
                const costSeconds = computeSpanCost({ ts: departureWorld, arrivalTs: arrivalWorld });
                
                content.push({ label: 'SPAN', value: originRecord.eventTitle || 'Span', color: '#ff00ff' });
                content.push({ label: 'DEPART', value: `${depDT.date} ${depDT.time}` });
                content.push({ label: 'ARRIVE', value: `${arrDT.date} ${arrDT.time}` });
                content.push({ label: 'SPENT', value: formatDurationCompact(costSeconds), color: '#ff6b6b' });
                if (originManifest.worldX !== undefined) {
                    content.push({ label: 'AGE', value: formatSubjectiveAge(originManifest.worldX) });
                }
                if (originRecord.eventSpanFromLocation) content.push({ label: 'FROM', value: originRecord.eventSpanFromLocation });
                if (originRecord.eventSpanToLocation) content.push({ label: 'TO', value: originRecord.eventSpanToLocation });
            }
        }
    }
    else {
        // LEVEL or SPAN-ORIGIN node: use physics nodes for coordinates
        // Physics nodes have x (age), y (departure time), arrivalY (arrival time).
        // Raw facts in record have display strings (titles, locations, etc).
        const physicsNode = physicsNodes.find(n => n.id === eventId);
        if (physicsNode) {
            const record = physicsNode.record || {};
            const dt = timestampToDateString(physicsNode.y);
            
            if (physicsNode.isSpanOrigin || record.eventIsSpan) {
                const arrDT = timestampToDateString(physicsNode.arrivalY || physicsNode.y);
                const costSeconds = computeSpanCost({ ts: physicsNode.y, arrivalTs: physicsNode.arrivalY || physicsNode.y });
                
                content.push({ label: 'SPAN', value: record.eventTitle || 'Span', color: '#ff00ff' });
                content.push({ label: 'DEPART', value: `${dt.date} ${dt.time}` });
                content.push({ label: 'ARRIVE', value: `${arrDT.date} ${arrDT.time}` });
                content.push({ label: 'SPENT', value: formatDurationCompact(costSeconds), color: '#ff6b6b' });
                content.push({ label: 'AGE', value: formatSubjectiveAge(physicsNode.x) });
                if (record.eventSpanFromLocation) content.push({ label: 'FROM', value: record.eventSpanFromLocation });
                if (record.eventSpanToLocation) content.push({ label: 'TO', value: record.eventToLocation });
            } else {
                content.push({ label: 'EVENT', value: record.eventTitle || 'Unknown', color: '#4da6ff' });
                content.push({ label: 'DATE', value: dt.date });
                content.push({ label: 'TIME', value: dt.time });
                content.push({ label: 'AGE', value: formatSubjectiveAge(physicsNode.x) });
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
 * Trinity: Pool projection via Kernel computePoolAfterSpan, display via TTL.
 * Uses physics nodes (state.nodes) for coordinates, not raw facts.
 */
function _updateDragTooltip(viewport, x, y) {
    const world = viewport._interaction.currentWorld;
    const content = [];

    if (viewport._interaction.mode === 'level') {
        const dt = timestampToDateString(world.eventTime);
        content.push({ label: 'ACTION', value: 'LEVELING...', color: '#4da6ff' });
        content.push({ label: 'DATE', value: dt.date });
        content.push({ label: 'TIME', value: dt.time });
        content.push({ label: 'AGE', value: formatSubjectiveAge(world.eventAge) });
    } 
    else if (viewport._interaction.mode === 'span') {
        const depDT = timestampToDateString(viewport._interaction.startWorld.eventTime);
        const arrDT = timestampToDateString(world.eventTime);

        // KERNEL: computePoolAfterSpan calculates remaining after proposed span
        const spanLevel = Number(viewport.actor.system.spanning?.span) || 0;
        const dobStr = viewport.actor.system.personal?.dob;
        // Build events array from PHYSICS nodes (have y/arrivalY coordinates)
        const physicsNodes = viewport.latestState?.nodes || [];
        const kernelEvents = physicsNodes
            .filter(n => n.id !== 'now' && !n.isVirtual && !n.isBirth)
            .map(n => ({
                id: n.id,
                eventIsSpan: Boolean(n.isSpanOrigin || n.record?.eventIsSpan),
                eventIsRest: Boolean(n.isRest || n.record?.eventIsRest),
                ts: Number(n.y) || 0,
                arrivalTs: Number(n.arrivalY || n.y) || 0
            }));
        // TTL: parse DOB safely
        const genesisMs = dobStr ? parseDateToObjectiveMs(dobStr) : 0;

        const pool = computePoolAfterSpan({
            spanLevel,
            events: kernelEvents,
            genesisTs: genesisMs,
            proposedDepartureMs: viewport._interaction.startWorld.eventTime,
            proposedArrivalMs: world.eventTime
        });

        content.push({ label: 'ACTION', value: 'SPANNING...', color: '#ff00ff' });
        content.push({ label: 'AGE', value: formatSubjectiveAge(world.eventAge) });
        content.push({ label: 'DEPART', value: `${depDT.date} ${depDT.time}` });
        content.push({ label: 'NOW', value: `${arrDT.date} ${arrDT.time}` });
        content.push({ label: 'SPENT', value: formatDurationCompact(pool.costSeconds) });
        content.push({ 
            label: 'REMAINING', 
            value: pool.remainingFormatted,
            color: pool.isOverSpan ? '#ff0000' : '#28a745'
        });
    }

    viewport.tooltipManager.show(content, { x, y });
}