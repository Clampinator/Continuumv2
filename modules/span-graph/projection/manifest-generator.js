import { projectDiagonal } from '../../temporal-kernel/project-diagonal.js';

/**
 * PROJECTION ENGINE: MANIFEST GENERATOR
 * The "Brain" of the Span Graph. Converts high-fidelity character data into
 * a pure list of screen coordinates and visual properties.
 * 
 * @param {Object} state - The state object from getTemporalState.
 * @param {SpanGraphViewport} viewport - Viewport for coordinate conversion.
 * @returns {Object} A RenderManifest for the dumb renderers.
 */
export function generateManifest(state, viewport) {
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

    const rect = viewport.container.getBoundingClientRect();

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
        // Level Rail (Blue)
        const railPoints = [seg.arrivalNode, ...seg.nodes];
        if (seg.exitPoint) railPoints.push(seg.exitPoint);

        manifest.rails.push({
            type: 'level',
            path: _pointsToPath(railPoints, viewport),
            nodes: railPoints.map(n => n.id)
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

    // 3. PROJECT NODES
    state.nodes.forEach(node => {
        const screen = viewport.worldToScreen(node.x, node.y);
        manifest.nodes.push({
            id: node.id,
            x: screen.x,
            y: screen.y,
            type: _resolveNodeType(node),
            record: node.record,
            spanDirection: node.spanDirection
        });
    });

    // 4. PROJECT EXPERIENCES
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

    // 5. PROJECT HUD
    if (state.nowNode) {
        const nowScreen = viewport.worldToScreen(state.nowNode.x, state.nowNode.y);
        manifest.hud.now = {
            x: nowScreen.x,
            y: nowScreen.y,
            age: state.nowNode.x,
            time: state.nowNode.y
        };
    }

    const history = state.nodes.filter(n => !n.isVirtual && !n.isNow);
    const lastEvent = history[history.length - 1] || { x: 0 };
    manifest.hud.creationStartX = viewport.worldToScreen(lastEvent.x, 0).x;

    return manifest;
}

function _pointsToPath(nodes, viewport) {
    const points = nodes.map(n => viewport.worldToScreen(n.x, n.y));
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function _resolveNodeType(node) {
    if (node.isBirth) return 'birth';
    if (node.isNow) return 'now';
    if (node.isSpanOrigin) return 'span-origin';
    if (node.isSpanDest) return 'span-dest';
    return 'level';
}
