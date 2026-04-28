/**
 * PROJECTION ENGINE: MANIFEST GENERATOR
 * Authoritative mapping of character state to screen coordinates.
 */
export function generateManifest(state, viewport, interaction = null) {
    const manifest = {
        rails: [], nodes: [], experiences: [], eras: [],
        hud: { now: null, creationStartX: null },
        interaction: {}
    };

    if (!state || !state.segments) return manifest;

    const isInteracting = interaction?.isDragging || interaction?.isPending;
    const isNowNode = interaction?.activeNodeId === 'now';
    const liveWorld = interaction?.currentWorld;
    const liveMode = interaction?.mode;

    // 1. PROJECT ERAS (Dumb Pipe: Data provided by Engine)
    if (state.eras) {
        state.eras.forEach(era => {
            const startX = viewport.worldToScreen(era.startAge, 0).x;
            const endX = viewport.worldToScreen(era.startAge + (era.duration || 0), 0).x;
            manifest.eras.push({
                name: era.name || 'Unknown Era',
                startX,
                width: Math.max(0, endX - startX),
                color: era.color || '#555'
            });
        });
    }

    // 2. PROJECT RAILS
    state.segments.forEach((seg, index) => {
        const isLastSegment = (index === state.segments.length - 1);
        const railNodes = [seg.arrivalNode, ...seg.nodes];
        if (seg.exitPoint) railNodes.push(seg.exitPoint);

        // AUTHORITY: Only extend the blue Level Rail to the 'NOW' node if we are LEVELING.
        // If we are SPANNING, the pink line takes authority and the level rail ends at history.
        if (isLastSegment && isInteracting && isNowNode && liveMode === 'level') {
            railNodes.push({ x: liveWorld.eventAge, y: liveWorld.eventTime });
        } else if (isLastSegment) {
            // Remove 'now' node from rail if it's not a level drag (to prevent ghost lines)
            const index = railNodes.findIndex(n => n.id === 'now');
            if (index !== -1) railNodes.splice(index, 1);
        }

        const points = railNodes.map(n => ({
            screen: viewport.worldToScreen(n.x, n.y),
            world: { eventAge: n.x, eventTime: n.y }
        }));

        manifest.rails.push({
            type: 'level',
            path: points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.screen.x} ${p.screen.y}`).join(' '),
            points: points
        });

        if (seg.exitPoint) {
            const nextSeg = state.segments[index + 1];
            if (nextSeg) {
                const p1 = viewport.worldToScreen(seg.exitPoint.x, seg.exitPoint.y);
                const p2 = viewport.worldToScreen(nextSeg.arrivalNode.x, nextSeg.arrivalNode.y);
                manifest.rails.push({
                    type: 'span', p1, p2, isFuture: nextSeg.arrivalNode.y > seg.exitPoint.y
                });
            }
        }
    });

    if (isInteracting && isNowNode && liveMode === 'span') {
        const p1 = viewport.worldToScreen(interaction.startWorld.eventAge, interaction.startWorld.eventTime);
        const p2 = viewport.worldToScreen(liveWorld.eventAge, liveWorld.eventTime);
        manifest.rails.push({
            type: 'span', p1, p2, isFuture: liveWorld.eventTime > interaction.startWorld.eventTime
        });
    }

    // 3. PROJECT NODES
    manifest.nodes = state.nodes.map(node => {
        const isTarget = node.id === interaction?.activeNodeId;
        const x = (isTarget && liveWorld) ? liveWorld.eventAge : node.x;
        const y = (isTarget && liveWorld) ? liveWorld.eventTime : node.y;
        const screen = viewport.worldToScreen(x, y);
        
        return {
            id: node.id, x: screen.x, y: screen.y,
            type: _resolveNodeType(node),
            record: node.record || node,
            spanDirection: node.spanDirection
        };
    });

    // 4. PROJECT PENDING NODE
    if (interaction?.isPending && liveWorld) {
        const screen = viewport.worldToScreen(liveWorld.eventAge, liveWorld.eventTime);
        manifest.nodes.push({
            id: 'pending-node', x: screen.x, y: screen.y,
            type: liveMode === 'span' ? 'span-dest' : 'level',
            spanDirection: liveWorld.eventTime > interaction.startWorld.eventTime ? 'up' : 'down',
            record: { eventTitle: "Creating..." }
        });
    }

    // 5. PROJECT INTERACTION (GHOST NODE)
    if (interaction?.ghostSnap) {
        manifest.interaction.ghost = {
            x: interaction.ghostSnap.screen.x,
            y: interaction.ghostSnap.screen.y
        };
    }

    // FORCE NOW ON TOP
    manifest.nodes.sort((a, b) => {
        if (a.id === 'now') return 1;
        if (b.id === 'now') return -1;
        return 0;
    });

    // 6. HUD ALIGNMENT
    const historyNodes = state.nodes.filter(n => !n.isVirtual && n.id !== 'now');
    const lastEvent = historyNodes.pop() || { x: 0 };
    manifest.hud.creationStartX = viewport.worldToScreen(lastEvent.x, 0).x;

    return manifest;
}

function _resolveNodeType(node) {
    if (node.isBirth) return 'birth';
    if (node.id === 'now') return 'now';
    if (node.isSpanDest) return 'span-dest';
    if (node.record?.eventIsSpan || node.isSpanOrigin) return 'span-origin';
    return 'level';
}
