import { projectDiagonal } from '../../temporal-kernel/project-diagonal.js';

/**
 * PROJECTION ENGINE: MANIFEST GENERATOR
 * The "Brain" of the Span Graph. Converts high-fidelity character data into
 * a pure list of screen coordinates and visual properties.
 * 
 * @param {Object} state - The state object from getTemporalState.
 * @param {SpanGraphViewport} viewport - Viewport for coordinate conversion.
 * @param {Object} interaction - Current interaction state for live overrides.
 * @returns {Object} A RenderManifest for the dumb renderers.
 */
export function generateManifest(state, viewport, interaction = null) {
    const manifest = {
        rails: [],
        nodes: [],
        experiences: [],
        eras: [],
        hud: {
            now: null,
            creationStartX: null
        }
    };

    if (!state || !state.segments) return manifest;

    const isDraggingNow = interaction?.isDragging && interaction.nodeElement?.classList.contains('graph-node-now');
    const dragWorld = interaction?.currentWorld;
    const dragMode = interaction?.mode;

    // 1. PROJECT ERAS
    const erasRaw = Object.values(viewport.actor.system.eras || {}).sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
    let currentAge = 0;
    erasRaw.forEach(era => {
        const startX = viewport.worldToScreen(currentAge, 0).x;
        const endX = viewport.worldToScreen(currentAge + Number(era.duration || 0), 0).x;
        manifest.eras.push({
            name: era.name,
            startX,
            width: Math.max(0, endX - startX),
            color: era.color
        });
        currentAge += Number(era.duration || 0);
    });

    // 2. PROJECT RAILS & SPANS
    state.segments.forEach((seg, index) => {
        const isLastSegment = (index === state.segments.length - 1);
        
        // Level Rail (Blue)
        const railNodes = [seg.arrivalNode, ...seg.nodes];
        if (seg.exitPoint) railNodes.push(seg.exitPoint);

        // AUTHORITY: Stretch the final rail if leveling the NOW node
        if (isLastSegment && isDraggingNow && dragMode === 'level') {
            railNodes.push({ x: dragWorld.age, y: dragWorld.time });
        }

        manifest.rails.push({
            type: 'level',
            path: _pointsToPath(railNodes, viewport),
            nodes: railNodes.map(n => n.id)
        });

        // Jump Span (Pink)
        if (seg.exitPoint) {
            const nextSeg = state.segments[index + 1];
            if (nextSeg) {
                const p1 = viewport.worldToScreen(seg.exitPoint.x, seg.exitPoint.y);
                const p2 = viewport.worldToScreen(nextSeg.arrivalNode.x, nextSeg.arrivalNode.y);
                manifest.rails.push({
                    type: 'span',
                    p1, p2,
                    direction: seg.exitPoint.spanDirection,
                    isFuture: nextSeg.arrivalNode.y > seg.exitPoint.y
                });
            }
        }
    });

    // AUTHORITY: Project LIVE PINK SPAN if spanning the NOW node
    if (isDraggingNow && dragMode === 'span') {
        const p1 = viewport.worldToScreen(interaction.startWorld.age, interaction.startWorld.time);
        const p2 = viewport.worldToScreen(dragWorld.age, dragWorld.time);
        manifest.rails.push({
            type: 'span',
            p1, p2,
            isFuture: dragWorld.time > interaction.startWorld.time
        });
    }

    // 3. PROJECT NODES
    state.nodes.forEach(node => {
        const nodeX = node.x !== undefined ? node.x : node.age;
        const nodeY = node.y !== undefined ? node.y : (node.ts || node.time || 0);
        if (nodeX === undefined || nodeY === undefined) return;

        const screen = viewport.worldToScreen(nodeX, nodeY);
        manifest.nodes.push({
            id: node.id,
            x: screen.x,
            y: screen.y,
            type: _resolveNodeType(node),
            record: node.record || node,
            spanDirection: node.spanDirection
        });
    });

    // 4. PROJECT NOW INDICATOR
    if (state.nowNode) {
        const nowX = isDraggingNow ? dragWorld.age : (state.nowNode.x !== undefined ? state.nowNode.x : state.nowNode.age);
        const nowY = isDraggingNow ? dragWorld.time : (state.nowNode.y !== undefined ? state.nowNode.y : (state.nowNode.ts || state.nowNode.time || 0));
        
        const nowScreen = viewport.worldToScreen(nowX, nowY);
        const nowNodeManifest = {
            id: 'now',
            x: nowScreen.x,
            y: nowScreen.y,
            type: 'now',
            record: { title: "NOW" },
            age: nowX,
            time: nowY
        };
        
        manifest.hud.now = nowNodeManifest;
        manifest.nodes.push(nowNodeManifest);
    }

    // 5. PROJECT EXPERIENCES
    state.experiences.forEach(exp => {
        const pStart = viewport.worldToScreen(exp.startX, exp.startY);
        const pEnd = viewport.worldToScreen(exp.endX, exp.endY);
        manifest.experiences.push({
            id: exp.id,
            name: exp.name,
            x: pStart.x,
            y: Math.min(pStart.y, pEnd.y),
            width: Math.max(1, pEnd.x - pStart.x),
            height: Math.max(1, Math.abs(pEnd.y - pStart.y)),
            isOngoing: exp.isOngoing,
            opacity: exp.opacity,
            color: exp.color
        });
    });

    // 6. HUD METADATA
    const historyNodes = state.nodes.filter(n => !n.isVirtual && !n.isNow);
    const lastEvent = historyNodes[historyNodes.length - 1] || { x: 0, age: 0 };
    const lastX = lastEvent.x !== undefined ? lastEvent.x : lastEvent.age;
    manifest.hud.creationStartX = viewport.worldToScreen(lastX, 0).x;

    return manifest;
}

function _pointsToPath(nodes, viewport) {
    const points = nodes.map(node => {
        const x = node.x !== undefined ? node.x : node.age;
        const y = node.y !== undefined ? node.y : (node.ts || node.time || 0);
        return viewport.worldToScreen(x, y);
    });
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function _resolveNodeType(node) {
    if (node.isBirth) return 'birth';
    if (node.isNow) return 'now';
    if (node.isSpanOrigin) return 'span-origin';
    if (node.isSpanDest) return 'span-dest';
    return 'level';
}
