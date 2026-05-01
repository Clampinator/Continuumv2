/**
 * PROJECTION ENGINE: MANIFEST GENERATOR
 * Authoritative mapping of character state to screen coordinates.
 *
 * Receives the pre-calculated TemporalState from the Engine and transforms
 * every element (eras, experiences, rails, nodes) from world coordinates
 * (age/time) to screen pixels via viewport.worldToScreen(). The resulting
 * manifest is a pure data object consumed by the dumb renderers - no domain
 * logic exists here, only coordinate conversion.
 *
 * PREVIEW-STATE ARCHITECTURE: The insert-span overlay has been removed.
 * Instead, a virtual span fact is injected into the history BEFORE this
 * generator runs. The temporal engine processes it identically to a
 * committed span, producing correct node positions, segments, and rails.
 * This generator just renders whatever state it receives.
 *
 * @param {Object} state - Pre-calculated TemporalState from getTemporalState()
 * @param {Object} viewport - SpanGraphViewport instance (provides worldToScreen)
 * @param {Object|null} interaction - Current pointer interaction state
 * @returns {Object} RenderManifest with screen-coordinate arrays
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

    // 1. PROJECT ERAS
    if (state.eras) {
        const containerRect = viewport.container.getBoundingClientRect();
        const maxEndX = containerRect.width;
        state.eras.forEach(era => {
            const startX = viewport.worldToScreen(era.startAge, 0).x;
            const eraEnd = era.endAge === Infinity ? maxEndX : viewport.worldToScreen(era.startAge + (era.duration || 0), 0).x;
            const width = Math.max(0, eraEnd - startX);
            manifest.eras.push({
                id: era.id,
                name: era.name || 'Unknown Era', startX,
                width, color: era.color || '#555'
            });
        });
    }

    // 2. PROJECT EXPERIENCES
    if (state.experiences) {
        state.experiences.forEach(exp => {
            const topLeft = viewport.worldToScreen(exp.startAge, exp.startTime);
            const bottomRight = viewport.worldToScreen(exp.endAge, exp.endTime);
            manifest.experiences.push({
                id: exp.id, name: exp.name, eraId: exp.eraId,
                x: Math.min(topLeft.x, bottomRight.x),
                y: Math.min(topLeft.y, bottomRight.y),
                width: Math.max(0, Math.abs(bottomRight.x - topLeft.x)),
                height: Math.max(0, Math.abs(bottomRight.y - topLeft.y)),
                isOngoing: exp.isOngoing, isClosed: exp.isClosed,
                opacity: exp.opacity, bonus: exp.bonus
            });
        });
    }

    // 3. PROJECT RAILS
    state.segments.forEach((seg, index) => {
        const isLastSegment = (index === state.segments.length - 1);

        // Build rail nodes array
        const railNodes = [seg.arrivalNode, ...seg.nodes];
        if (seg.exitPoint) railNodes.push(seg.exitPoint);

        // NOW-node drag: inject live position into last segment
        if (isLastSegment && isInteracting && isNowNode && liveMode === 'level') {
            railNodes.push({ x: liveWorld.eventAge, y: liveWorld.eventTime });
        }

        // Hide NOW from rail when not actively dragging it (it renders as a
        // standalone node with its own position)
        if (isLastSegment && !(isInteracting && isNowNode && liveMode === 'level')) {
            const nowIdx = railNodes.findIndex(n => n.id === 'now');
            if (nowIdx !== -1) railNodes.splice(nowIdx, 1);
        }

        // Render the level rail from segment's rail nodes
        const points = railNodes.map(n => ({
            screen: viewport.worldToScreen(n.x, n.y),
            world: { eventAge: n.x, eventTime: n.y }
        }));

        manifest.rails.push({
            type: 'level',
            path: points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.screen.x} ${p.screen.y}`).join(' '),
            points: points
        });

        // Render span line connecting this segment's exit to next segment's arrival
        if (seg.exitPoint) {
            const nextSeg = state.segments[index + 1];
            if (nextSeg) {
                const p1 = viewport.worldToScreen(seg.exitPoint.x, seg.exitPoint.y);
                const p2 = viewport.worldToScreen(nextSeg.arrivalNode.x, nextSeg.arrivalNode.y);

                // Mark preview span lines with dashed styling
                const isPreview = seg.exitPoint.id === 'preview-insert-span';

                manifest.rails.push({
                    type: 'span', p1, p2,
                    isFuture: nextSeg.arrivalNode.y > seg.exitPoint.y,
                    isInserting: isPreview
                });
            }
        }
    });

    // NOW-node live span line
    if (isInteracting && isNowNode && liveMode === 'span') {
        const p1 = viewport.worldToScreen(interaction.startWorld.eventAge, interaction.startWorld.eventTime);
        const p2 = viewport.worldToScreen(liveWorld.eventAge, liveWorld.eventTime);
        manifest.rails.push({
            type: 'span', p1, p2,
            isFuture: liveWorld.eventTime > interaction.startWorld.eventTime
        });
    }

    // 4. PROJECT NODES
    // Determine which nodes are part of the preview (virtual inserted span)
    // so the renderer can apply dashed styling
    const previewExitIndex = state.segments.findIndex(
        seg => seg.exitPoint?.id === 'preview-insert-span'
    );

    manifest.nodes = state.nodes.map(node => {
        const isTarget = node.id === interaction?.activeNodeId;
        const x = (isTarget && liveWorld) ? liveWorld.eventAge : node.x;
        const y = (isTarget && liveWorld) ? liveWorld.eventTime : node.y;
        const screen = viewport.worldToScreen(x, y);

        // Mark the departure node (span origin) and the arrival node
        // (virtual span-dest in the segment after the preview exit)
        // as preview for dashed renderer styling
        const isPreview = node.id === 'preview-insert-span'
            || (previewExitIndex !== -1 && node.isSpanDest && node.isVirtual
                && state.segments[previewExitIndex + 1]?.arrivalNode?.id === node.id);

        return {
            id: node.id, x: screen.x, y: screen.y,
            type: _resolveNodeType(node),
            record: node.record || node,
            spanDirection: node.spanDirection,
            isPreview
        };
    });

    // 5. PROJECT PENDING NODE (NOW-drag behavior)
    if (interaction?.isPending && liveWorld && interaction.mode !== 'insert-span') {
        const screen = viewport.worldToScreen(liveWorld.eventAge, liveWorld.eventTime);
        manifest.nodes.push({
            id: 'pending-node', x: screen.x, y: screen.y,
            type: liveMode === 'span' ? 'span-dest' : 'level',
            spanDirection: liveWorld.eventTime > interaction.startWorld.eventTime ? 'up' : 'down',
            record: { eventTitle: "Creating..." }
        });
    }

    // 6. PROJECT INTERACTION (GHOST NODE)
    if (interaction?.ghostSnap && interaction.mode !== 'insert-span') {
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

    // 7. HUD ALIGNMENT
    const historyNodes = state.nodes.filter(n => !n.isVirtual && n.id !== 'now');
    const lastEvent = historyNodes.pop() || { x: 0 };
    manifest.hud.creationStartX = viewport.worldToScreen(lastEvent.x, 0).x;

    // 8. ERA CREATION DRAG RECT
    // Visible only when dragging out a new era
    if (interaction?.type === 'create-era' && interaction?.isDragging) {
        const startScreen = viewport.worldToScreen(interaction.startWorld?.eventAge || 0, 0);
        const currentScreen = viewport.worldToScreen(interaction.currentWorld?.eventAge || 0, 0);
        const containerRect = viewport.container.getBoundingClientRect();
        const gutterHeight = 35;
        manifest.hud.creationDragRect = {
            startX: Math.min(startScreen.x, currentScreen.x),
            endX: Math.max(startScreen.x, currentScreen.x),
            y: containerRect.height - gutterHeight - 20,
            height: 20
        };
    }

    return manifest;
}

function _resolveNodeType(node) {
    if (node.isBirth) return 'birth';
    if (node.id === 'now') return 'now';
    if (node.isSpanDest) return 'span-dest';
    if (node.record?.eventIsSpan || node.isSpanOrigin) return 'span-origin';
    return 'level';
}