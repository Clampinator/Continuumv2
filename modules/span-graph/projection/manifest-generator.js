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

    const isInteracting = interaction?.isDragging && !interaction?.isPending;
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
                name: era.name || 'Unknown Era',
                startAge: era.startAge,
                endAge: era.endAge,
                duration: era.duration,
                color: era.color || null,
                startX,
                width
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

        // REST SUB-RAILS: If the segment contains a rest node, draw a green
        // rail from the rest node to the next node (24h rest duration).
        // Uses railNodes (which includes arrival/exit/NOW-drag nodes) so the
        // green line reaches the next visible node even when NOW is filtered
        // from seg.nodes.
        const restPositionsInRail = [];
        for (let ri = 0; ri < railNodes.length; ri++) {
            if (railNodes[ri].isRest) restPositionsInRail.push(ri);
        }

        for (const rni of restPositionsInRail) {
            // The rest rail goes from the rest node to the next rail node
            const nextIdx = rni + 1;
            if (nextIdx < railNodes.length) {
                const rNode = railNodes[rni];
                const nNode = railNodes[nextIdx];
                const rp = viewport.worldToScreen(rNode.x, rNode.y);
                const np = viewport.worldToScreen(nNode.x, nNode.y);
                manifest.rails.push({
                    type: 'rest',
                    path: `M ${rp.x} ${rp.y} L ${np.x} ${np.y}`,
                    p1: rp,
                    p2: np
                });
            }
        }

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
    // Build a lookup of span-origin nodes so span-dest nodes can
    // reference their origin's full span data for tooltip display.
    const spanOrigins = new Map();
    for (const node of state.nodes) {
        if (node.isSpanOrigin && node.id !== 'now') {
            spanOrigins.set(node.id, node);
        }
    }

    // For each segment that starts with a span arrival (isSpanDest), the
    // previous segment's exitPoint is the span-origin. Store that mapping.
    const destToOriginMap = new Map();
    for (let i = 1; i < state.segments.length; i++) {
        const seg = state.segments[i];
        if (seg.arrivalNode?.isSpanDest && state.segments[i - 1]?.exitPoint) {
            destToOriginMap.set(seg.arrivalNode.id, state.segments[i - 1].exitPoint.id);
        }
    }

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

        const manifestNode = {
            id: node.id, x: screen.x, y: screen.y,
            type: _resolveNodeType(node),
            record: node.record || node,
            spanDirection: node.spanDirection,
            isPreview,
            isRest: node.isRest || false,
            isRestEnd: node.isRestEnd || false,
            linkedGoalIds: (node.record?.linkedGoalIds || node.linkedGoalIds || []),
            // Hierarchy keys for goal linking and event editing
            eraId: node.eraId || node.record?.eraId || null,
            expId: node.expId || node.record?.expId || null
        };

        // SPAN-ORIGIN: carry arrivalY and worldX/worldY for tooltip display
        if (node.isSpanOrigin && node.id !== 'now') {
            manifestNode.arrivalY = node.arrivalY;
            manifestNode.worldX = node.x;
            manifestNode.worldY = node.y;
        }

        // SPAN-DEST: link to the originating span so tooltips can display
        // departure/arrival/cost data from the span-origin's full record.
        if (node.isSpanDest) {
            const originId = destToOriginMap.get(node.id);
            manifestNode.spanOriginId = originId || null;
        }

        return manifestNode;
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
    // Expose the last real event so the pointer machine can open an
    // edit dialog for it when the user right-clicks the NOW node.
    const historyNodes = state.nodes.filter(n => !n.isVirtual && n.id !== 'now');
    const lastEvent = historyNodes[historyNodes.length - 1] || null;
    manifest.hud.creationStartX = viewport.worldToScreen(lastEvent?.x || 0, 0).x;
    manifest.hud.lastRealEvent = lastEvent;

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

    // 9. PROJECT YET NODES + YET RAILS
    // Yets are resolved by the Kernel and projected to screen coordinates here.
    // The YetRenderer consumes node data; the RailRenderer draws dashed cyan
    // connector lines from NOW to each Yet (the "future rail").
    manifest.yetNodes = [];
    if (state.yetNodes && state.yetNodes.length > 0) {
        // Find NOW's screen position from already-projected nodes
        const nowScreen = manifest.nodes.find(n => n.id === 'now');

        manifest.yetNodes = state.yetNodes.map(yet => {
            const isDragging = interaction?.yetDrag?.id === yet.id;
            let screen;

            if (isDragging) {
                screen = { x: interaction.yetDrag.screenX, y: interaction.yetDrag.screenY };
            } else {
                screen = viewport.worldToScreen(yet.worldAge, yet.worldTime);
            }

            // Dashed cyan connector from NOW to this Yet node
            if (nowScreen && !yet.isViolated) {
                manifest.rails.push({
                    type: 'yet',
                    p1: { x: nowScreen.x, y: nowScreen.y },
                    p2: { x: screen.x, y: screen.y }
                });
            }

            return {
                id: yet.id,
                description: yet.description,
                hasAge: yet.hasAge,
                hasDate: yet.hasDate,
                x: screen.x,
                y: screen.y,
                isViolated: yet.isViolated,
                frag: yet.frag,
                isDragging,
                shakeAmplitude: yet.shakeAmplitude,
                shakeDuration: yet.shakeDuration,
                particleDurationOffset: yet.particleDurationOffset
            };
        });
    }

    return manifest;
}

function _resolveNodeType(node) {
    if (node.isBirth) return 'birth';
    if (node.id === 'now') return 'now';
    if (node.isSpanDest) return 'span-dest';
    if (node.record?.eventIsSpan || node.isSpanOrigin) return 'span-origin';
    if (node.isRestEnd) return 'rest-end';
    if (node.isRest) return 'rest';
    return 'level';
}