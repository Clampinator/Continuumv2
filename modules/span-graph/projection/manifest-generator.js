import { applyInsertionShift } from '../../temporal-kernel/apply-insertion-shift.js';

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
 * INSERT-SPAN MODE: When the interaction mode is 'insert-span', this generator
 * splits the clicked rail segment at the departure point and shifts all
 * subsequent segments by the displacement. The rail is visually severed at
 * the departure point, a span line connects departure to arrival, and a
 * new level rail resumes from the arrival point onward.
 *
 * The 30-degree diagonal means shifting an event's objective time also
 * shifts its visual position diagonally on screen - this is handled
 * automatically by worldToScreen since Y (time) is the shifted axis.
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
    const isInsertSpan = liveMode === 'insert-span' && isInteracting;

    // INSERT-SPAN: Compute displacement and apply shift to node positions
    let shiftedNodes = state.nodes;
    let displacementData = null;

    if (isInsertSpan && interaction?.insertionContext && interaction?.displacementResult) {
        const ctx = interaction.insertionContext;
        const result = interaction.displacementResult;
        displacementData = {
            departureAge: ctx.departureAge,
            departureTime: ctx.departureTime,
            arrivalTime: result.arrivalTime,
            displacement: result.displacement,
            segmentIndex: ctx.segmentIndex
        };
        shiftedNodes = applyInsertionShift(
            state.nodes, ctx.departureAge, result.displacement
        );

        // DEBUG: Live displacement manifest trace (Phase 1)
        const shiftedCount = shiftedNodes.filter((n, i) =>
            state.nodes[i] && shiftedNodes[i].y !== state.nodes[i].y
        ).length;
        console.warn('[INSERT-SPAN-MANIFEST]', JSON.stringify({
            isInsertSpan,
            isInteracting,
            liveMode,
            departureAge: ctx.departureAge,
            displacement: result.displacement,
            segmentIndex: ctx.segmentIndex,
            totalNodes: state.nodes.length,
            shiftedCount,
            segmentCount: state.segments.length,
            sampleShifted: shiftedNodes.slice(0, 3).map((n, i) => ({
                id: n.id, x: n.x,
                yShifted: shiftedNodes[i].y,
                yOriginal: state.nodes[i].y,
                changed: shiftedNodes[i].y !== state.nodes[i].y
            }))
        }));
    } else if (isInteracting) {
        // DEBUG: Why is insert-span path NOT taken?
        console.warn('[INSERT-SPAN-MANIFEST] SKIP', JSON.stringify({
            isInsertSpan, liveMode, isInteracting,
            hasCtx: !!interaction?.insertionContext,
            hasResult: !!interaction?.displacementResult
        }));
    }

    // Helper: shift a node's Y coordinates by displacement if it's
    // after the insertion point. Arrival nodes for segments after the
    // splice must also be shifted.
    const d = displacementData?.displacement || 0;

    // 1. PROJECT ERAS
    if (state.eras) {
        state.eras.forEach(era => {
            const startX = viewport.worldToScreen(era.startAge, 0).x;
            const endX = viewport.worldToScreen(era.startAge + (era.duration || 0), 0).x;
            manifest.eras.push({
                name: era.name || 'Unknown Era', startX,
                width: Math.max(0, endX - startX), color: era.color || '#555'
            });
        });
    }

    // 1.5 PROJECT EXPERIENCES
    if (state.experiences) {
        state.experiences.forEach(exp => {
            // INSERT-SPAN: Shift experience time coordinates if after splice.
            // Experiences that overlap the splice point get their start/end
            // times shifted if they fall after the departure age.
            let expStartTime = exp.startTime;
            let expEndTime = exp.endTime;
            if (isInsertSpan && displacementData) {
                if (exp.startAge > displacementData.departureAge) {
                    expStartTime += d;
                }
                if (exp.endAge > displacementData.departureAge) {
                    expEndTime += d;
                }
            }
            const topLeft = viewport.worldToScreen(exp.startAge, expStartTime);
            const bottomRight = viewport.worldToScreen(exp.endAge, expEndTime);
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

    // 2. PROJECT RAILS
    // INSERT-SPAN architecture:
    // - Segments BEFORE splice: render normally (unchanged)
    // - Splice segment: split at departure, insert span line, resume at arrival
    // - Segments AFTER splice: all nodes shifted by displacement
    let railDebugLogged = false;
    state.segments.forEach((seg, index) => {
        const isLastSegment = (index === state.segments.length - 1);
        const isAfterSplice = displacementData && index > displacementData.segmentIndex;
        const isSpliceSegment = displacementData && index === displacementData.segmentIndex;
        const isBeforeSplice = displacementData && index < displacementData.segmentIndex;

        // DEBUG: Rail segment classification (only log once per render)
        if (displacementData && !railDebugLogged) {
            console.warn('[INSERT-SPAN-RAILS]', JSON.stringify({
                segmentCount: state.segments.length,
                spliceIndex: displacementData.segmentIndex,
                segmentTypes: state.segments.map((s, i) => ({
                    i,
                    type: i < displacementData.segmentIndex ? 'before'
                        : i === displacementData.segmentIndex ? 'splice'
                        : 'after',
                    nodeCount: s.nodes.length,
                    hasArrival: !!s.arrivalNode,
                    hasExit: !!s.exitPoint
                }))
            }));
            railDebugLogged = true;
        }

        // Build rail nodes array, shifting Y for segments after the splice
        const railNodes = [seg.arrivalNode, ...seg.nodes];
        if (seg.exitPoint) railNodes.push(seg.exitPoint);

        // Remove NOW from rail if not a level drag
        if (isLastSegment && isInteracting && isNowNode && liveMode === 'level') {
            railNodes.push({ x: liveWorld.eventAge, y: liveWorld.eventTime });
        } else if (isLastSegment) {
            const nowIdx = railNodes.findIndex(n => n.id === 'now');
            if (nowIdx !== -1) railNodes.splice(nowIdx, 1);
        }

        // SEGMENTS BEFORE SPLICE: render normally
        if (isBeforeSplice || !isInsertSpan) {
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
                        type: 'span', p1, p2,
                        isFuture: nextSeg.arrivalNode.y > seg.exitPoint.y
                    });
                }
            }
            return;
        }

        // SPLICE SEGMENT: split rail at departure, insert span line
        if (isSpliceSegment) {
            const departureNode = {
                id: 'insert-departure', x: displacementData.departureAge,
                y: displacementData.departureTime,
                isSpanOrigin: true, record: { eventIsSpan: true, eventTitle: 'Span' }
            };
            const arrivalNode = {
                id: 'insert-arrival', x: displacementData.departureAge,
                y: displacementData.arrivalTime,
                isSpanDest: true, isVirtual: true, record: { eventTitle: 'Arrival' }
            };

            // Shift rail nodes after the departure point
            const processedRailNodes = railNodes.map(n => {
                const nodeAge = Number(n.x || 0);
                if (nodeAge <= displacementData.departureAge + 0.001) {
                    return n;
                }
                return {
                    ...n,
                    y: Number(n.y || 0) + d,
                    arrivalY: n.arrivalY != null ? Number(n.arrivalY) + d : undefined
                };
            });

            const insertIdx = processedRailNodes.findIndex(
                n => Number(n.x || 0) > displacementData.departureAge + 0.001
            );

            // If no nodes after departure, the rail is just the left portion
            // plus departure, and arrival is at the end of that left portion.
            const hasAfterNodes = insertIdx !== -1;

            // Left rail: arrivalNode ... nodes before departure ... departure
            const beforeNodes = hasAfterNodes
                ? processedRailNodes.slice(0, insertIdx)
                : processedRailNodes;

            const leftPoints = beforeNodes.map(n => ({
                screen: viewport.worldToScreen(n.x, n.y),
                world: { eventAge: n.x, eventTime: n.y }
            }));
            leftPoints.push({
                screen: viewport.worldToScreen(departureNode.x, departureNode.y),
                world: { eventAge: departureNode.x, eventTime: departureNode.y }
            });

            manifest.rails.push({
                type: 'level',
                path: leftPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.screen.x} ${p.screen.y}`).join(' '),
                points: leftPoints
            });

            // Span line: departure to arrival (pink dashed line)
            const depScreen = viewport.worldToScreen(departureNode.x, departureNode.y);
            const arrScreen = viewport.worldToScreen(arrivalNode.x, arrivalNode.y);
            manifest.rails.push({
                type: 'span', p1: depScreen, p2: arrScreen,
                isFuture: arrivalNode.y < departureNode.y,
                isInserting: true
            });

            // Right rail: arrival ... shifted afterNodes
            const afterNodes = hasAfterNodes
                ? processedRailNodes.slice(insertIdx)
                : [];

            const rightPoints = [{
                screen: viewport.worldToScreen(arrivalNode.x, arrivalNode.y),
                world: { eventAge: arrivalNode.x, eventTime: arrivalNode.y }
            }];
            afterNodes.forEach(n => {
                rightPoints.push({
                    screen: viewport.worldToScreen(n.x, n.y),
                    world: { eventAge: n.x, eventTime: n.y }
                });
            });

            if (rightPoints.length > 1) {
                manifest.rails.push({
                    type: 'level',
                    path: rightPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.screen.x} ${p.screen.y}`).join(' '),
                    points: rightPoints
                });
            }

            // If there's an exit point at the end of this segment, render
            // the span to the next segment with shifted coordinates
            if (seg.exitPoint) {
                // The exit point is shifted because it's after the departure
                const shiftedExitY = Number(seg.exitPoint.y || 0) + d;
                const nextSeg = state.segments[index + 1];
                if (nextSeg) {
                    // Next segment's arrival node is also shifted
                    const nextArrivalY = Number(nextSeg.arrivalNode.y || 0) + d;
                    const p1 = viewport.worldToScreen(seg.exitPoint.x, shiftedExitY);
                    const p2 = viewport.worldToScreen(nextSeg.arrivalNode.x, nextArrivalY);
                    manifest.rails.push({
                        type: 'span', p1, p2,
                        isFuture: nextArrivalY > shiftedExitY
                    });
                }
            }
            return;
        }

        // SEGMENTS AFTER SPLICE: all nodes shifted by displacement
        if (isAfterSplice) {
            const shiftedRailNodes = railNodes.map(n => ({
                ...n,
                y: Number(n.y || 0) + d,
                arrivalY: n.arrivalY != null ? Number(n.arrivalY) + d : undefined
            }));

            const points = shiftedRailNodes.map(n => ({
                screen: viewport.worldToScreen(n.x, n.y),
                world: { eventAge: n.x, eventTime: n.y }
            }));

            manifest.rails.push({
                type: 'level',
                path: points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.screen.x} ${p.screen.y}`).join(' '),
                points: points
            });

            // Shift existing span lines between segments
            if (seg.exitPoint) {
                const nextSeg = state.segments[index + 1];
                if (nextSeg) {
                    const shiftedExitY = Number(seg.exitPoint.y || 0) + d;
                    const nextArrivalY = Number(nextSeg.arrivalNode.y || 0) + d;
                    const p1 = viewport.worldToScreen(seg.exitPoint.x, shiftedExitY);
                    const p2 = viewport.worldToScreen(nextSeg.arrivalNode.x, nextArrivalY);
                    manifest.rails.push({
                        type: 'span', p1, p2,
                        isFuture: nextArrivalY > shiftedExitY
                    });
                }
            }
            return;
        }
    });

    // NOW-node live span line (existing behavior)
    if (isInteracting && isNowNode && liveMode === 'span') {
        const p1 = viewport.worldToScreen(interaction.startWorld.eventAge, interaction.startWorld.eventTime);
        const p2 = viewport.worldToScreen(liveWorld.eventAge, liveWorld.eventTime);
        manifest.rails.push({
            type: 'span', p1, p2,
            isFuture: liveWorld.eventTime > interaction.startWorld.eventTime
        });
    }

    // 3. PROJECT NODES
    const renderNodes = isInsertSpan ? shiftedNodes : state.nodes;

    manifest.nodes = renderNodes.map(node => {
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

    // INSERT-SPAN: Add departure and arrival nodes
    if (isInsertSpan && displacementData) {
        const depScreen = viewport.worldToScreen(
            displacementData.departureAge, displacementData.departureTime
        );
        const arrScreen = viewport.worldToScreen(
            displacementData.departureAge, displacementData.arrivalTime
        );

        manifest.nodes.push({
            id: 'insert-departure',
            x: depScreen.x, y: depScreen.y,
            type: 'span-origin',
            spanDirection: displacementData.arrivalTime > displacementData.departureTime ? 'up' : 'down',
            record: { eventIsSpan: true, eventTitle: 'Span' }
        });

        manifest.nodes.push({
            id: 'insert-arrival',
            x: arrScreen.x, y: arrScreen.y,
            type: 'span-dest',
            spanDirection: displacementData.arrivalTime > displacementData.departureTime ? 'up' : 'down',
            record: { eventTitle: 'Arrival' }
        });
    }

    // 4. PROJECT PENDING NODE (existing NOW-drag behavior)
    if (interaction?.isPending && liveWorld && !isInsertSpan) {
        const screen = viewport.worldToScreen(liveWorld.eventAge, liveWorld.eventTime);
        manifest.nodes.push({
            id: 'pending-node', x: screen.x, y: screen.y,
            type: liveMode === 'span' ? 'span-dest' : 'level',
            spanDirection: liveWorld.eventTime > interaction.startWorld.eventTime ? 'up' : 'down',
            record: { eventTitle: "Creating..." }
        });
    }

    // 5. PROJECT INTERACTION (GHOST NODE)
    if (interaction?.ghostSnap && !isInsertSpan) {
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