import { resolvePointerMode } from './resolve-pointer-mode.js';
import { calculateGhostSnap } from './calculate-ghost-snap.js';
import { computeSplicePoint } from '../../state/compute-splice-point.js';
import { calculateInsertionDisplacement } from '../../temporal-kernel/calculate-insertion-displacement.js';
import { constrainInsertionMovement } from '/systems/continuum-v2/modules/temporal-kernel/drag-physics.js';
import { getLoreContext } from '../../state/get-lore-context.js';
import { solveNowDragConstraint } from '../../temporal-kernel/solve-now-drag-constraint.js';
import { validateSpanPhysics } from '../../temporal-kernel/validate-span-physics.js';
import { formatSubjectiveAge } from '../../span-graph-utils/provide-span-graph-utils.js';
import { convertTimestampToDateString } from '../../span-graph-utils/provide-span-graph-utils.js';
import { openExperienceEditDialog } from '../../span-graph-dialog-experience.js';
import { buildPreviewHistory } from '../../temporal-engine/build-preview-history.js';

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
                const dt = convertTimestampToDateString(this.state.ghostSnap.world.eventTime);
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
            // INSERT-SPAN: Interactive span insertion from rail drag
            if (this.state.insertionContext) {
                this._handleInsertSpanDrag(screenPos);
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
        const depDT = convertTimestampToDateString(result.departureTime);
        const arrDT = convertTimestampToDateString(result.arrivalTime);
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

        // INSERT-SPAN: Commit or cancel span insertion
        if (wasDragging && this.state.insertionContext && this.state.mode === 'insert-span') {
            await this._commitInsertSpan();
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

        // Near-zero displacement: user clicked without meaningful drag. Cancel.
        if (displacement < 60000) {
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

        const targetNodeId = event.target.dataset.eventId;
        if (!targetNodeId || targetNodeId === 'now') return;

        const node = (this.viewport.latestState?.nodes || []).find(n => n.id === targetNodeId);
        if (!node) return;

        this.state.isPending = true;
        this.viewport._interaction.isPending = true;
        
        await this._openDialog('edit', node.x, node.y, node.record.eventIsSpan, node);
    }

    async _openDialog(mode, age, time, eventIsSpan = false, existingData = null) {
        const { openEventNodeDialog } = await import('../../span-graph-ui-dialogs.js');
        const dt = convertTimestampToDateString(time);
        
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
        const isBreathBlocked = isInsertMode ? false : Boolean(predecessor?.isSpanOrigin || predecessor?.record?.eventIsSpan);
        const isRankBlocked = (lore.spanRank || 0) < 1;

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

        await openEventNodeDialog(this.actor.sheet, {
            mode, ageRaw: age, timeRaw: time, date: dt.date, time: dt.time, eventIsSpan,
            departure,
            arrival,
            insertionContext: this.state.insertionContext,
            existingData,
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
            previewHistory: null
        };
    }

    _generateHUD(world, mode, lore) {
        const dt = convertTimestampToDateString(world.eventTime);
        const rows = [
            { label: 'ACTION', value: mode === 'level' ? 'LEVELING' : 'SPANNING', color: mode === 'level' ? '#00e5ff' : '#ff00ff' },
            { label: 'AGE', value: formatSubjectiveAge(world.eventAge) },
            { label: 'DATE', value: dt.date }
        ];

        if (mode === 'span') {
            const validation = validateSpanPhysics({ y: this.state.startWorld.eventTime, arrivalY: world.eventTime, record: { eventIsSpan: true } }, lore);
            if (!validation.isValid) {
                rows[0] = { label: 'ILLEGAL', value: validation.error, color: '#ff0000' };
            } else if (validation.warning) {
                rows.push({ label: 'WARNING', value: validation.warning, color: '#ffd700' });
            }
        }

        // PHYSICS VETO HUD: When spanning is blocked, explain WHY the drag
        // is forced to level mode. This prevents user confusion when they
        // try to span but the system forces leveling.
        if (mode === 'level') {
            const isBreathBlocked = Boolean(lore.lastEvent?.record?.eventIsSpan);
            const isRankBlocked = (lore.spanRank || 0) < 1;
            if (isBreathBlocked) {
                rows.push({ label: 'BLOCKED', value: 'LEVEL BREATH - Span follows span', color: '#ff4444' });
            } else if (isRankBlocked) {
                rows.push({ label: 'BLOCKED', value: 'SPAN RANK 0 - Cannot span', color: '#ff4444' });
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

    _updateStaticHover(event, screenPos) {
        const nodeId = event.target.dataset.eventId;
        if (!nodeId) { this.viewport.tooltipManager.hide(); return; }
        const node = (this.viewport.latestState?.nodes || []).find(n => n.id === nodeId);
        if (!node) return;
        const dt = convertTimestampToDateString(node.y);
        this.viewport.tooltipManager.show([
            { label: 'EVENT', value: node.record.eventTitle || 'Unknown', color: '#00e5ff' },
            { label: 'AGE', value: formatSubjectiveAge(node.x) },
            { label: 'DATE', value: dt.date }
        ], screenPos);
    }
}