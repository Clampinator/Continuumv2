import { resolvePointerMode } from './resolve-pointer-mode.js';
import { calculateGhostSnap } from './calculate-ghost-snap.js';
import { computeSplicePoint } from '../../state/compute-splice-point.js';
import { calculateInsertionDisplacement } from '../../temporal-kernel/calculate-insertion-displacement.js';
import { constrainInsertionMovement } from '/systems/continuum-v2/modules/temporal-kernel/drag-physics.js';
import { getLoreContext } from '../../state/get-lore-context.js';
import { solveNowDragConstraint } from '../../temporal-kernel/solve-now-drag-constraint.js';
import { validateSpanPhysics } from '../../temporal-kernel/validate-span-physics.js';
import { resolveEraDrag } from '/systems/continuum-v2/modules/temporal-kernel/resolve-era-drag.js';
import { resolveEraEditContext } from '/systems/continuum-v2/modules/temporal-kernel/resolve-era-edit-context.js';
import { computeEraBoundaries } from '/systems/continuum-v2/modules/temporal-kernel/compute-era-boundaries.js';
import { resolveEventEra } from '/systems/continuum-v2/modules/temporal-kernel/resolve-event-era.js';
import { computeSpanCost, computePoolAfterSpan } from '/systems/continuum-v2/modules/temporal-kernel/calculate-span-pool.js';
import { formatSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { timestampToDateString, parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { formatDurationCompact } from '/systems/continuum-v2/modules/temporal-translator/duration-converter.js';
import { findLastKnownLocation } from '/systems/continuum-v2/modules/lifeline/services/context-finder/find-last-known-location.js';
import { openExperienceEditDialog } from '../../span-graph-dialog-experience.js';
import { buildPreviewHistory } from '../../temporal-engine/build-preview-history.js';
import { MIN_DRAG_DISPLACEMENT_MS } from '../../temporal-engine/constants.js';

/**
 * INTERACTION: POINTER MACHINE
 * Authoritative controller for the Chain of Life.
 * Supports three drag modes: level, span (NOW drag), and insert-span (rail drag).
 */
export class PointerMachine {
    constructor(viewport) {
        this.viewport = viewport;
        this.actor = viewport.actor;
        this.state = this._getInitialState();
    }

    _getInitialState() {
        return {
            isDown: false, isDragging: false, isPending: false,
            startScreen: { x: 0, y: 0 },
            startWorld: { eventAge: 0, eventTime: 0 },
            currentWorld: { eventAge: 0, eventTime: 0 },
            mode: null, activeNodeId: null, ghostSnap: null,
            // INSERT-SPAN: Context for interactive span insertion from rail click
            insertionContext: null,
            // Committed history captured at pointer-down as preview baseline
            baseHistory: null
        };
    }

    onDown(event, screenPos) {
        if (this.state.isPending) return;

        // YET NODE DRAG: Left-click on a Yet node starts drag
        const yetTarget = event.target.closest('.graph-node-yet');
        if (yetTarget) {
            const yetId = yetTarget.getAttribute('data-yet-id');
            if (yetId) {
                this.state.isDown = true;
                this.state.isDragging = false;
                this.state.mode = 'drag-yet';
                this.state.activeNodeId = null;
                this.state.startScreen = screenPos;
                this.state.startWorld = this.viewport.screenToWorld(screenPos.x, screenPos.y);
                this.state.currentWorld = { ...this.state.startWorld };
                // Store Yet drag state in interaction for manifest projection
                this.viewport._interaction.yetDrag = { id: yetId, screenX: screenPos.x, screenY: screenPos.y };
                if (this.viewport.svg.setPointerCapture) {
                    this.viewport.svg.setPointerCapture(event.pointerId);
                }
                return;
            }
        }

        // ERA CREATION BAR: Start era drag on click
        const creationBar = event.target.closest('.creation-bar-era');
        if (creationBar || event.target.closest('.span-graph-creation')) {
            this.state.isDown = true;
            this.state.isDragging = false;
            this.state.mode = 'create-era';
            this.state.startScreen = screenPos;
            const boundaries = computeEraBoundaries(this.actor.system.eras);
            // Last era's endAge may be Infinity (open-ended era).
            // Use the last era's startAge as fallback, or 0 if no eras.
            const lastBoundary = boundaries.length > 0 ? boundaries[boundaries.length - 1] : null;
            const startAge = lastBoundary
                ? (lastBoundary.endAge === Infinity ? lastBoundary.startAge : lastBoundary.endAge)
                : 0;
            this.state.startWorld = { eventAge: startAge, eventTime: 0 };
            this.state.currentWorld = { ...this.state.startWorld };

            this.viewport._interaction = {
                isDragging: false,
                type: 'create-era',
                startWorld: this.state.startWorld,
                currentWorld: this.state.currentWorld
            };
            return;
        }

        // ERA LABEL: Click to edit era, double-click to center viewport on era
        const eraLabel = event.target.closest('.graph-era-label');
        if (eraLabel) {
            const eraId = eraLabel.getAttribute('data-id');
            if (eraId) {
                this._openEditEraDialog(eraId);
                return;
            }
        }

        // ERA LABEL DOUBLE-CLICK: Center viewport on era midpoint
        // (handled by dblclick listener in _bindEvents)

        this.state.isDown = true;
        this.state.startScreen = screenPos;
        
        const target = event.target;
        this.state.activeNodeId = target.dataset.eventId || null;

        // Capture the committed history at pointer-down time as the base
        // for any preview builds. This prevents preview stacking if the
        // drag spans multiple render frames (each buildPreviewHistory
        // call must start from the same committed baseline).
        this.state.baseHistory = this.viewport.latestHistory || [];

        // RULE: Snapping to Origin
        if (this.state.activeNodeId) {
            const node = (this.viewport.latestState?.nodes || []).find(n => n.id === this.state.activeNodeId);
            if (node) {
                this.state.startWorld = { eventAge: node.x, eventTime: node.y };
            } else {
                this.state.startWorld = this.viewport.screenToWorld(screenPos.x, screenPos.y);
            }
        } else {
            this.state.startWorld = this.viewport.screenToWorld(screenPos.x, screenPos.y);

            // INSERT-SPAN: If ghost-snap exists at pointer down, initiate span insertion.
            // The ghost-snap already identified the exact point on the rail.
            const snap = this.viewport._interaction?.ghostSnap;
            if (snap && snap.world) {
                const history = this.viewport.latestState?.nodes || [];
                const originTime = this.viewport._getOriginTime();
                const splicePoint = computeSplicePoint(snap.world, history, originTime);
                this.state.insertionContext = splicePoint;
                // Override startWorld to the rail-projected point for perfect vertical lock
                this.state.startWorld = {
                    eventAge: splicePoint.departureAge,
                    eventTime: splicePoint.departureTime
                };
            }
        }
        
        this.state.currentWorld = { ...this.state.startWorld };
    }

    onMove(event, screenPos) {
        if (this.state.isPending) return;

        if (!this.state.isDown) {
            // RULE: Node Hover Priority
            const targetNodeId = event.target.dataset.eventId;
            if (targetNodeId) {
                this.state.ghostSnap = null;
                this.viewport._interaction.ghostSnap = null;
                this._updateStaticHover(event, screenPos);
                this.viewport._render();
                return;
            }

            // RULE: Ghost Node Preview (Level Rails Only)
            if (!this.viewport.latestManifest?.rails) {
                this.viewport._interaction.ghostSnap = null;
                this.viewport.tooltipManager.hide();
                return;
            }

            this.state.ghostSnap = calculateGhostSnap(screenPos, this.viewport.latestManifest.rails);
            // HANDSHAKE: Provide the snap to the interaction state for the Projector
            this.viewport._interaction.ghostSnap = this.state.ghostSnap;

            if (this.state.ghostSnap) {
                const dt = timestampToDateString(this.state.ghostSnap.world.eventTime);
                this.viewport.tooltipManager.show([
                    { label: 'INSERT', value: 'CLICK TO ADD', color: '#ffd700' },
                    { label: 'AGE', value: formatSubjectiveAge(this.state.ghostSnap.world.eventAge) },
                    { label: 'DATE', value: dt.date }
                ], screenPos);
            } else {
                this.viewport.tooltipManager.hide();
            }
            
            this.viewport._render();
            return;
        }

        const dx = Math.abs(screenPos.x - this.state.startScreen.x);
        const dy = Math.abs(screenPos.y - this.state.startScreen.y);

        if (!this.state.isDragging && (dx > 5 || dy > 5)) {
            this.state.isDragging = true;
        }

        if (this.state.isDragging) {
            // ERA CREATION DRAG: Update current world position
            if (this.state.mode === 'create-era' || this.state.insertionContext) {
                if (this.state.insertionContext) {
                    this._handleInsertSpanDrag(screenPos);
                } else if (this.state.mode === 'create-era') {
                    const rawWorld = this.viewport.screenToWorld(screenPos.x, screenPos.y);
                    // ERA DRAG: Only move forward (one-directional)
                    this.state.currentWorld = {
                        eventAge: Math.max(rawWorld.eventAge, this.state.startWorld.eventAge),
                        eventTime: 0
                    };
                    this.viewport._interaction.currentWorld = this.state.currentWorld;
                    this.viewport._interaction.isDragging = true;
                    this.viewport._render();
                }
            } else if (this.state.mode === 'drag-yet') {
                // YET DRAG: Update Yet node position for manifest projection
                this.viewport._interaction.yetDrag = {
                    id: this.viewport._interaction.yetDrag?.id,
                    screenX: screenPos.x,
                    screenY: screenPos.y
                };
                this.viewport._render();
            } else if (this.state.activeNodeId === 'now') {
                this._handleNowDrag(screenPos);
            } else {
                this._handlePanning(screenPos);
            }
        }
    }

    /**
     * INSERT-SPAN DRAG: Handles live span insertion during vertical drag.
     * Age is locked to departure. Arrival time is clamped by physics constraints.
     * Displacement is computed and propagated to viewport for live rendering.
     */
    _handleInsertSpanDrag(screenPos) {
        const rawWorld = this.viewport.screenToWorld(screenPos.x, screenPos.y);
        const constrainedWorld = constrainInsertionMovement(
            rawWorld, this.state.insertionContext
        );

        // KERNEL: Compute displacement for HUD and floor constraint
        const history = this.viewport.latestState?.nodes || [];
        const displacementResult = calculateInsertionDisplacement(
            this.state.insertionContext.departureAge,
            this.state.insertionContext.departureTime,
            constrainedWorld.eventTime,
            history
        );

        this.state.mode = 'insert-span';
        this.state.currentWorld = {
            eventAge: displacementResult.departureAge,
            eventTime: displacementResult.arrivalTime
        };

        // PREVIEW STATE: Build a virtual history with the span injected
        // so the temporal engine pipeline produces the correct preview
        // state automatically. Always use the committed base history
        // captured at pointer-down to prevent preview stacking.
        const baseHistory = this.state.baseHistory || [];
        const previewHistory = buildPreviewHistory(
            baseHistory, this.state.insertionContext, displacementResult
        );

        // SYNC VIEWPORT: Provide preview history for the render pipeline
        this.viewport._interaction = {
            isDragging: true,
            mode: 'insert-span',
            activeNodeId: null,
            currentWorld: this.state.currentWorld,
            startWorld: this.state.startWorld,
            insertionContext: this.state.insertionContext,
            displacementResult: displacementResult,
            previewHistory: previewHistory
        };

        // HUD: Show displacement info during insertion drag
        const lore = getLoreContext(this.actor);
        this.viewport.tooltipManager.show(
            this._generateInsertionHUD(displacementResult, lore),
            screenPos
        );

        this.viewport._render();
    }

    /**
     * Generates HUD content for live span insertion drag.
     */
    _generateInsertionHUD(result, lore) {
        const depDT = timestampToDateString(result.departureTime);
        const arrDT = timestampToDateString(result.arrivalTime);
        const durationMs = Math.abs(result.arrivalTime - result.departureTime);
        const direction = result.isUpSpan ? 'UP' : result.isDownSpan ? 'DOWN' : 'ZERO';
        const directionColor = result.isUpSpan ? '#00ff00' : result.isDownSpan ? '#ff00ff' : '#888888';

        const rows = [
            { label: 'INSERTING', value: `${direction} SPAN`, color: directionColor },
            { label: 'AGE', value: formatSubjectiveAge(result.departureAge) },
            { label: 'DEPART', value: depDT.date },
            { label: 'ARRIVE', value: arrDT.date },
            { label: 'SHIFT', value: `${(Math.abs(result.displacement) / 1000).toFixed(1)}s` }
        ];

        // Physics validation for insertion spans.
        // The Level Breath check must use the event at the insertion point,
        // not the chronologically last event in the character's history.
        // An insertion into a level rail is always valid by definition:
        // the click point IS on a level segment (ghost-snap only targets level rails).
        // We still check Span Rank (Rank 0 cannot span).
        if (lore.spanRank < 1) {
            rows.push({ label: 'ILLEGAL', value: 'SPAN RANK 0', color: '#ff0000' });
        }

        return rows;
    }

    _handleNowDrag(screenPos) {
        const lore = getLoreContext(this.actor);
        const result = solveNowDragConstraint(
            screenPos, this.state.startScreen, this.state.startWorld,
            (x, y) => this.viewport.screenToWorld(x, y),
            { spanRank: lore.spanRank, lastEvent: lore.lastEvent }
        );

        this.state.mode = result.mode;
        this.state.currentWorld = result.world;

        // SYNC VIEWPORT (For live rail stretching)
        this.viewport._interaction = {
            isDragging: true,
            activeNodeId: 'now',
            mode: result.mode,
            currentWorld: result.world,
            startWorld: this.state.startWorld
        };

        this.viewport.tooltipManager.show(this._generateHUD(result.world, result.mode, lore), screenPos);
        this.viewport._render();
    }

    async onUp(event, screenPos) {
        if (!this.state.isDown || this.state.isPending) return;

        this.state.isDown = false;
        const wasDragging = this.state.isDragging;
        this.state.isDragging = false;
        this.viewport.tooltipManager.hide();

        // ERA CREATION: Complete drag and open dialog
        if (wasDragging && this.state.mode === 'create-era') {
            await this._completeEraCreation();
            return;
        }

        // INSERT-SPAN: Commit or cancel span insertion
        if (wasDragging && this.state.insertionContext && this.state.mode === 'insert-span') {
            await this._commitInsertSpan();
            return;
        }

        // YET DRAG: Check for fulfillment (dropped on NOW) or edit
        if (this.state.mode === 'drag-yet') {
            await this._completeYetDrag(screenPos, wasDragging);
            return;
        }

        if (!wasDragging) {
            if (this.state.ghostSnap) {
                await this._openDialog('insert', this.state.ghostSnap.world.eventAge, this.state.ghostSnap.world.eventTime);
            }
            return;
        }

        if (this.state.activeNodeId === 'now' && this.state.mode) {

            this.state.isPending = true;
            this.viewport._interaction.isPending = true;
            await this._openDialog('log', this.state.currentWorld.eventAge, this.state.currentWorld.eventTime, this.state.mode === 'span');
        } else {
            this._resetInteraction();
        }
    }

    /**
     * COMMIT INSERT-SPAN: Opens the span dialog pre-populated with drag data.
     * If displacement is near-zero (< 1 minute), cancels the insertion.
     */
    async _commitInsertSpan() {
        const ctx = this.state.insertionContext;
        const arrival = this.state.currentWorld;
        const displacement = Math.abs(arrival.eventTime - ctx.departureTime);

        // DEBUG: Span insert initiated - capture drag coordinates
        console.warn('[INSERT-SPAN] 1-INITIATED (drag end)', JSON.stringify({
            departureAge: ctx.departureAge,
            departureTime: ctx.departureTime,
            arrivalAge: arrival.eventAge,
            arrivalTime: arrival.eventTime,
            displacement,
            departureMinusArrival: ctx.departureTime - arrival.eventTime,
            beforeNode: ctx.beforeNode
                ? { id: ctx.beforeNode.id, age: ctx.beforeNode.age, isSpanOrigin: ctx.beforeNode.isSpanOrigin }
                : null
        }));

        // UX GUARD (not physics): Near-zero displacement means the user
        // clicked without meaningful drag. Cancel to prevent accidental
        // dialog opens. The Kernel separately rejects zero-displacement spans.
        if (displacement < MIN_DRAG_DISPLACEMENT_MS) {
            this._resetInteraction();
            return;
        }

        this.state.isPending = true;
        this.viewport._interaction.isPending = true;

        // Open the span dialog with pre-populated departure/arrival data.
        // Pass the ARRIVAL time as timeRaw (the dialog uses this as the
        // default arrival time for spans), and the DEPARTURE time as
        // a separate parameter so the dialog can set both dates correctly.
        await this._openDialog(
            'insert',
            ctx.departureAge,
            arrival.eventTime,
            true  // eventIsSpan
        );
    }

    /**
     * YET DRAG COMPLETION: Handles both fulfillment (dropped on NOW)
     * and edit (click without drag). When a Yet is dragged onto the NOW node,
     * it fulfills the loop - marking the Yet as done and creating a history event.
     * When a Yet is clicked without significant drag, it opens the edit dialog.
     */
    async _completeYetDrag(screenPos, wasDragging) {
        const yetId = this.viewport._interaction?.yetDrag?.id;
        if (!yetId) {
            this._resetInteraction();
            return;
        }

        // FULFILLMENT CHECK: Was the Yet dragged close to the NOW node?
        if (wasDragging) {
            const nowNode = this.viewport.latestState?.nowNode;
            if (nowNode) {
                const nowScreen = this.viewport.worldToScreen(nowNode.x, nowNode.y);
                const dist = Math.hypot(screenPos.x - nowScreen.x, screenPos.y - nowScreen.y);
                // Threshold: 25px from NOW center counts as a drop
                if (dist < 25) {
                    await this._fulfillYet(yetId);
                    return;
                }
            }
        }

        // No fulfillment: reset drag state
        this._resetInteraction();
        this.viewport._render();
    }

    /**
     * FULFILL A YET: Marks the Yet as done and creates a fulfillment event
     * at the NOW position, closing the spacetime loop.
     */
    async _fulfillYet(yetId) {
        const { fulfillYet } = await import('./yet-fulfillment.js');
        await fulfillYet(this.actor, yetId, this.viewport);
        this._resetInteraction();
        this.viewport._render();
    }

    async onRightClick(event, screenPos) {
        if (this.state.isPending) return;

        // EXPERIENCE LABEL: Right-click on an experience label opens
        // the experience edit dialog with name, description, and event list.
        const expTarget = event.target.closest('.graph-exp-label');
        if (expTarget) {
            const expId = expTarget.getAttribute('data-id');
            const eraId = expTarget.getAttribute('data-era-id');
            const exp = this.actor.system.eras[eraId]?.experiences[expId];
            if (exp) {
                this.state.isPending = true;
                this.viewport._interaction.isPending = true;
                openExperienceEditDialog(
                    { id: expId, eraId, ...exp },
                    this.actor.sheet,
                    this.viewport.viewState,
                    () => this._resetInteraction()
                );
            }
            return;
        }

        // YET NODE: Right-click on a Yet node opens edit dialog
        const yetTarget = event.target.closest('.graph-node-yet');
        if (yetTarget) {
            const yetId = yetTarget.getAttribute('data-yet-id');
            if (yetId) {
                const yetData = this.actor.system.theYet?.[yetId];
                if (yetData) {
                    this.state.isPending = true;
                    this.viewport._interaction.isPending = true;
                    const { showYetDialog } = await import('../../span-graph-dialog-create-yet.js');
                    showYetDialog({
                        sheet: this.actor.sheet,
                        svg: this.viewport.svg,
                        existingData: { id: yetId, ...yetData },
                        viewport: this.viewport,
                        screenPos
                    });
                    this._resetInteraction();
                    this.viewport._render();
                }
            }
            return;
        }

        const targetNodeId = event.target.dataset.eventId;
        if (!targetNodeId || targetNodeId === 'now') return;

        const node = (this.viewport.latestState?.nodes || []).find(n => n.id === targetNodeId);
        if (!node) return;

        this.state.isPending = true;
        this.viewport._interaction.isPending = true;

        // SPAN ARRIVAL: Right-clicking an arrival node opens the same span edit dialog
        // as the origin node. The arrival node is virtual (no DB record), so we find
        // the span-origin and delegate entirely to it.
        if (node.isSpanDest) {
            const originNode = (this.viewport.latestState?.nodes || []).find(
                n => n.isSpanOrigin && n.arrivalY === node.y
            );
            if (originNode) {
                await this._openDialog('edit', originNode.x, originNode.y, true, originNode);
                return;
            }
        }

        await this._openDialog('edit', node.x, node.y, node.record.eventIsSpan, node);
    }

    /**
     * DOUBLE-CLICK: Creates a new Yet when double-clicking on empty space
     * to the right of NOW (the character's future). The double-click must
     * land in the future zone (worldAge > nowAge + 0.5) to qualify.
     * Era labels have their own dblclick handler and take priority.
     */
    async onDoubleClick(event, screenPos) {
        if (this.state.isPending) return;

        const nowNode = this.viewport.latestState?.nowNode;
        if (nowNode) {
            const world = this.viewport.screenToWorld(screenPos.x, screenPos.y);
            if (world.eventAge > nowNode.x + 0.5) {
                this.state.isPending = true;
                this.viewport._interaction.isPending = true;
                const { showYetDialog } = await import('../../span-graph-dialog-create-yet.js');
                showYetDialog({
                    sheet: this.actor.sheet,
                    svg: this.viewport.svg,
                    worldAge: world.eventAge,
                    worldTime: world.eventTime,
                    viewport: this.viewport,
                    screenPos
                });
                this._resetInteraction();
                this.viewport._render();
                return;
            }
        }
    }

    async _openDialog(mode, age, time, eventIsSpan = false, existingData = null) {
        const { openEventNodeDialog } = await import('../../span-graph-ui-dialogs.js');
        const dt = timestampToDateString(time);
        
        // HIERARCHY GATE: When spanning is physically impossible (Level Breath
        // or Rank 0), pass a veto flag so the dialog can disable the span
        // checkbox and prevent the user from attempting an illegal action.
        //
        // INSERT-SPAN BREATH CHECK: For insert-span, the relevant predecessor
        // is the event immediately before the insertion point, NOT the globally
        // last event. Ghost-snap only targets level rails, so beforeNode is
        // always a level event or birth. But lore.lastEvent could be a span
        // later in the history, which would falsely block the insertion.
        const lore = getLoreContext(this.actor);
        const isInsertMode = mode === 'insert' && this.state.insertionContext;
        const predecessor = isInsertMode ? this.state.insertionContext.beforeNode : lore.lastEvent;
        // INSERT-SPAN: Level Breath is impossible in insert mode. Ghost-snap
        // only targets level rails, so the insertion point is always on a
        // level segment - even if the beforeNode in sort order is a span
        // origin. The beforeNode is the span's DEPARTURE, but the click is
        // on the level rail AFTER the span's arrival.
        const isBreathBlocked = (isInsertMode || mode === 'edit') ? false : Boolean(predecessor?.isSpanOrigin || predecessor?.record?.eventIsSpan);
        const isRankBlocked = mode === 'edit' ? false : (lore.spanRank || 0) < 1;

        // INSERT-SPAN: Pass departure/arrival context for pre-population
        const departure = this.state.startWorld;
        const arrival = this.state.mode === 'insert-span' ? this.state.currentWorld : null;

        // DEBUG: Span insert dialog opening
        if (mode === 'insert') {
            console.warn('[INSERT-SPAN] 2-DIALOG OPENING', JSON.stringify({
                mode,
                ageRaw: age,
                timeRaw: time,
                eventIsSpan,
                spanDisabled: isBreathBlocked || isRankBlocked,
                isBreathBlocked,
                predecessorIsSpan: predecessor?.isSpanOrigin || predecessor?.record?.eventIsSpan,
                predecessorId: predecessor?.id,
                departure: departure ? { eventAge: departure.eventAge, eventTime: departure.eventTime } : null,
                arrival: arrival ? { eventAge: arrival.eventAge, eventTime: arrival.eventTime } : null,
                departureMinusArrival: departure && arrival ? departure.eventTime - arrival.eventTime : null
            }));
        }

        // RESOLVE ERA: Explicitly resolve era from node data or age position
        const resolvedEraId = existingData?.eraId || resolveEventEra(this.actor.system.eras, age);
        const resolvedExpId = existingData?.expId || null;

        await openEventNodeDialog(this.actor.sheet, {
            mode, ageRaw: age, timeRaw: time, date: dt.date, time: dt.time, eventIsSpan,
            departure,
            arrival,
            insertionContext: this.state.insertionContext,
            existingData,
            eraId: resolvedEraId,
            expId: resolvedExpId,
            // PHYSICS VETO: Span checkbox is disabled when spanning is blocked.
            spanDisabled: isBreathBlocked || isRankBlocked,
            onClose: (confirmed) => {
                this._resetInteraction();
                this.viewport._render();
            }
        });
    }

    _resetInteraction() {
        this.state = this._getInitialState();
        this.viewport._interaction = {
            isDragging: false, isPending: false, mode: null, 
            activeNodeId: null, currentWorld: null, startWorld: null,
            insertionContext: null, displacementResult: null,
            previewHistory: null, yetDrag: null
        };
    }

    /**
     * ERA CREATION: Completes the era drag gesture.
     * Validates via the kernel and opens the create era dialog.
     */
    async _completeEraCreation() {
        const startAge = this.state.startWorld.eventAge;
        const currentAge = this.state.currentWorld.eventAge;
        const result = resolveEraDrag(this.actor.system.eras, startAge, currentAge);

        if (!result.isValid) {
            this._resetInteraction();
            this.viewport._render();
            return;
        }

        this.state.isPending = true;
        this.viewport._interaction.isPending = true;
        this.viewport.viewState.interactionMode = 'dialog-open';

        // Set creation context for the dialog
        this.viewport.viewState.creationStartAgeSeconds = result.startAgeSeconds;
        this.viewport.viewState.creationCurrentAgeSeconds = currentAge;

        const { showCreateEraDialog } = await import('../../span-graph-ui-dialogs.js');
        showCreateEraDialog(
            this.viewport.viewState,
            {},
            this.actor.sheet,
            this.viewport.svg,
            result.durationSeconds,
            Object.values(this.actor.system.eras || {}),
            result.isFirstEra
        );

        this._resetInteraction();
        this.viewport._render();
    }

    /**
     * ERA EDIT: Opens the era edit dialog for a clicked era label.
     */
    async _openEditEraDialog(eraId) {
        const eras = this.actor.system.eras;
        const ctx = resolveEraEditContext(eras, eraId);
        if (!ctx) return;

        this.state.isPending = true;
        this.viewport._interaction.isPending = true;
        this.viewport.viewState.interactionMode = 'dialog-open';

        const { openEraEditDialog } = await import('../../span-graph-dialog-age.js');
        openEraEditDialog(ctx, this.actor.sheet, this.viewport.viewState);

        this._resetInteraction();
        this.viewport._render();
    }

    _generateHUD(world, mode, lore) {
        const dt = timestampToDateString(world.eventTime);
        const rows = [
            { label: 'ACTION', value: mode === 'level' ? 'LEVELING' : 'SPANNING', color: mode === 'level' ? '#00e5ff' : '#ff00ff' },
            { label: 'AGE', value: formatSubjectiveAge(world.eventAge) },
            { label: 'DATE', value: dt.date }
        ];

        if (mode === 'level') {
            // Show time for level drags
            rows.push({ label: 'TIME', value: dt.time });
            // Show aging cost
            const dAge = world.eventAge - this.state.startWorld.eventAge;
            if (dAge > 0) {
                rows.push({ label: 'AGING', value: formatDurationCompact(dAge), color: '#00e5ff' });
            }
            // PHYSICS VETO HUD: Explain why spanning is blocked
            const isBreathBlocked = Boolean(lore.lastEvent?.record?.eventIsSpan);
            const isRankBlocked = (lore.spanRank || 0) < 1;
            if (isBreathBlocked) {
                rows.push({ label: 'BLOCKED', value: 'LEVEL BREATH - Span follows span', color: '#ff4444' });
            } else if (isRankBlocked) {
                rows.push({ label: 'BLOCKED', value: 'SPAN RANK 0 - Cannot span', color: '#ff4444' });
            }
        } else if (mode === 'span') {
            // Span drag: show departure, arrival, cost, and remaining pool
            const depDT = timestampToDateString(this.state.startWorld.eventTime);
            const arrDT = timestampToDateString(world.eventTime);
            rows.push({ label: 'DEPART', value: `${depDT.date} ${depDT.time}` });
            rows.push({ label: 'NOW', value: `${arrDT.date} ${arrDT.time}` });

            const costSeconds = computeSpanCost({
                ts: this.state.startWorld.eventTime,
                arrivalTs: world.eventTime
            });
            rows.push({ label: 'SPENT', value: formatDurationCompact(costSeconds), color: '#ff6b6b' });

            // Pool projection via Kernel
            const spanRank = Number(this.viewport.actor?.system?.spanning?.span) || 0;
            if (spanRank > 0) {
                const dobStr = this.viewport.actor?.system?.personal?.dob;
                const genesisMs = dobStr ? parseDateToObjectiveMs(dobStr) : 0;
                const physicsNodes = this.viewport.latestState?.nodes || [];
                const kernelEvents = physicsNodes
                    .filter(n => n.id !== 'now' && !n.isVirtual && !n.isBirth)
                    .map(n => ({
                        id: n.id,
                        eventIsSpan: Boolean(n.isSpanOrigin || n.record?.eventIsSpan),
                        eventIsRest: Boolean(n.isRest || n.record?.eventIsRest),
                        ts: Number(n.y) || 0,
                        arrivalTs: Number(n.arrivalY || n.y) || 0
                    }));
                const pool = computePoolAfterSpan({
                    spanLevel: spanRank,
                    events: kernelEvents,
                    genesisTs: genesisMs,
                    proposedDepartureMs: this.state.startWorld.eventTime,
                    proposedArrivalMs: world.eventTime
                });
                rows.push({
                    label: 'REMAINING',
                    value: pool.remainingFormatted,
                    color: pool.isOverSpan ? '#ff0000' : '#28a745'
                });
            }

            // Physics validation
            const validation = validateSpanPhysics({ y: this.state.startWorld.eventTime, arrivalY: world.eventTime, record: { eventIsSpan: true } }, lore);
            if (!validation.isValid) {
                rows[0] = { label: 'ILLEGAL', value: validation.error, color: '#ff0000' };
            } else if (validation.warning) {
                rows.push({ label: 'WARNING', value: validation.warning, color: '#ffd700' });
            }
        }

        return rows;
    }

    _handlePanning(screenPos) {
        const dx = screenPos.x - this.state.startScreen.x;
        const dy = screenPos.y - this.state.startScreen.y;
        this.viewport.setViewState({
            panX: this.viewport.viewState.panX + dx, panY: this.viewport.viewState.panY + dy
        });
        this.state.startScreen = screenPos;
    }

    /**
     * HOVER TOOLTIP: Shows contextual metadata for any node under the pointer.
     * Data flow: Physics nodes (state.nodes) have x/y/arrivalY coordinates.
     * Raw facts (latestHistory) have record fields (titles, locations, etc).
     * Manifest nodes carry arrivalY/worldY/worldX for span-origin nodes
     * and spanOriginId for span-dest nodes.
     */
    _updateStaticHover(event, screenPos) {
        // YET NODE HOVER
        const yetTarget = event.target.closest('.graph-node-yet');
        if (yetTarget) {
            const yetId = yetTarget.getAttribute('data-yet-id');
            const yetDesc = yetTarget.getAttribute('data-yet-desc') || '';
            const yetNodes = this.viewport.latestManifest?.yetNodes || [];
            const yet = yetNodes.find(n => n.id === yetId);
            if (yet) {
                const rows = [
                    { label: 'YET', value: yetDesc || 'Unknown Yet', color: '#ff9f43' }
                ];
                if (yet.hasAge) rows.push({ label: 'AGE', value: 'LOCKED', color: '#ffd700' });
                if (yet.hasDate) rows.push({ label: 'DATE', value: 'LOCKED', color: '#ffd700' });
                if (!yet.hasAge && !yet.hasDate) rows.push({ label: 'DRIFTING', value: 'Nebulous', color: '#888' });
                if (yet.isViolated) rows.push({ label: 'VIOLATED', value: 'Loop broken!', color: '#ff2222' });
                this.viewport.tooltipManager.show(rows, screenPos);
            } else {
                this.viewport.tooltipManager.hide();
            }
            return;
        }

        // Identify which node type we're hovering
        const nodeEl = event.target.closest('.graph-node-level, .graph-node-span-origin, .graph-node-span-dest, .graph-node-now');
        if (!nodeEl) {
            this.viewport.tooltipManager.hide();
            return;
        }

        const nodeId = nodeEl.dataset.eventId;
        if (!nodeId) { this.viewport.tooltipManager.hide(); return; }

        const state = this.viewport.latestState;
        if (!state) { this.viewport.tooltipManager.hide(); return; }

        const physicsNodes = state.nodes || [];
        const history = this.viewport.latestHistory || [];
        const content = [];

        // NOW NODE: Show status, date/time, age, and last known location
        if (nodeEl.classList.contains('graph-node-now')) {
            const nowNode = state.nowNode;
            if (!nowNode) { this.viewport.tooltipManager.hide(); return; }
            const dt = timestampToDateString(nowNode.y);
            const location = findLastKnownLocation(history, nowNode.x);
            content.push({ label: 'STATUS', value: 'NOW', color: '#ffd700' });
            content.push({ label: 'DATE', value: dt.date });
            content.push({ label: 'TIME', value: dt.time });
            content.push({ label: 'AGE', value: formatSubjectiveAge(nowNode.x) });
            content.push({ label: 'LOCATION', value: location, color: '#8ecae6' });
        }
        // SPAN DEST (ARRIVAL) NODE: Rich span info via manifest link
        else if (nodeEl.classList.contains('graph-node-span-dest')) {
            const manifestNodes = this.viewport.latestManifest?.nodes || [];
            const destManifest = manifestNodes.find(n => n.id === nodeId);
            const originId = destManifest?.spanOriginId;
            if (originId) {
                const originManifest = manifestNodes.find(n => n.id === originId);
                if (originManifest) {
                    const originRecord = originManifest.record || {};
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
        // LEVEL or SPAN-ORIGIN NODE: Physics nodes for coordinates, record for display
        else {
            const physicsNode = physicsNodes.find(n => n.id === nodeId);
            if (physicsNode) {
                const record = physicsNode.record || {};
                const dt = timestampToDateString(physicsNode.y);
                if (physicsNode.isSpanOrigin || record.eventIsSpan) {
                    // SPAN ORIGIN
                    const arrDT = timestampToDateString(physicsNode.arrivalY || physicsNode.y);
                    const costSeconds = computeSpanCost({ ts: physicsNode.y, arrivalTs: physicsNode.arrivalY || physicsNode.y });
                    content.push({ label: 'SPAN', value: record.eventTitle || 'Span', color: '#ff00ff' });
                    content.push({ label: 'DEPART', value: `${dt.date} ${dt.time}` });
                    content.push({ label: 'ARRIVE', value: `${arrDT.date} ${arrDT.time}` });
                    content.push({ label: 'SPENT', value: formatDurationCompact(costSeconds), color: '#ff6b6b' });
                    content.push({ label: 'AGE', value: formatSubjectiveAge(physicsNode.x) });
                    if (record.eventSpanFromLocation) content.push({ label: 'FROM', value: record.eventSpanFromLocation });
                    if (record.eventSpanToLocation) content.push({ label: 'TO', value: record.eventSpanToLocation });
                } else {
                    // LEVEL EVENT
                    content.push({ label: 'EVENT', value: record.eventTitle || 'Unknown', color: '#4da6ff' });
                    content.push({ label: 'DATE', value: dt.date });
                    content.push({ label: 'TIME', value: dt.time });
                    content.push({ label: 'AGE', value: formatSubjectiveAge(physicsNode.x) });
                    if (record.eventLocation) content.push({ label: 'LOCATION', value: record.eventLocation, color: '#8ecae6' });
                }
            }
        }

        if (content.length > 0) {
            this.viewport.tooltipManager.show(content, screenPos);
        } else {
            this.viewport.tooltipManager.hide();
        }
    }
}