import { resolvePointerMode } from './resolve-pointer-mode.js';
import { calculateGhostSnap } from './calculate-ghost-snap.js';
import { insertHistoryRow } from '../../state/insert-history-row.js';
import { getLoreContext } from '../../state/get-lore-context.js';
import { solveNowDragConstraint } from '../../temporal-kernel/solve-now-drag-constraint.js';
import { validateSpanPhysics } from '../../temporal-kernel/validate-span-physics.js';
import { convertTimestampToDateString, formatSubjectiveAge } from '../../span-graph-utils/provide-span-graph-utils.js';

/**
 * INTERACTION: POINTER MACHINE
 * Authoritative controller for the Chain of Life.
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
            startWorld: { age: 0, time: 0 },
            currentWorld: { age: 0, time: 0 },
            mode: null, activeNodeId: null, ghostSnap: null
        };
    }

    onDown(event, screenPos) {
        if (this.state.isPending) return;

        this.state.isDown = true;
        this.state.startScreen = screenPos;
        
        const target = event.target;
        this.state.activeNodeId = target.dataset.eventId || null;

        // RULE: Snapping to Origin
        // The drag must start from the EXACT world coordinates of the node, not the mouse pixel.
        if (this.state.activeNodeId) {
            const node = this.viewport.latestHistory.find(n => n.id === this.state.activeNodeId);
            if (node) {
                this.state.startWorld = { age: node.x, time: node.y };
            } else {
                this.state.startWorld = this.viewport.screenToWorld(screenPos.x, screenPos.y);
            }
        } else {
            this.state.startWorld = this.viewport.screenToWorld(screenPos.x, screenPos.y);
        }
        
        this.state.currentWorld = { ...this.state.startWorld };
    }

    onMove(event, screenPos) {
        if (this.state.isPending) return;

        if (!this.state.isDown) {
            // RULE: Node Hover Priority
            // If the mouse is over an existing node, do not show the "Click to Add" preview.
            const targetNodeId = event.target.dataset.eventId;
            if (targetNodeId) {
                this.state.ghostSnap = null;
                this.viewport.nodeRenderer.renderGhostNode(null);
                this._updateStaticHover(event, screenPos);
                return;
            }

            // RULE: Ghost Node Preview (Empty Blue Lines Only)
            this.state.ghostSnap = calculateGhostSnap(screenPos, this.viewport.latestManifest.rails);
            
            if (this.state.ghostSnap) {
                this.viewport.nodeRenderer.renderGhostNode(this.state.ghostSnap.screen);
                const dt = convertTimestampToDateString(this.state.ghostSnap.world.time);
                this.viewport.tooltipManager.show([
                    { label: 'INSERT', value: 'CLICK TO ADD', color: '#ffd700' },
                    { label: 'AGE', value: formatSubjectiveAge(this.state.ghostSnap.world.age) },
                    { label: 'DATE', value: dt.date }
                ], screenPos);
            } else {
                this.viewport.nodeRenderer.renderGhostNode(null);
                this.viewport.tooltipManager.hide();
            }
            return;
        }

        const dx = Math.abs(screenPos.x - this.state.startScreen.x);
        const dy = Math.abs(screenPos.y - this.state.startScreen.y);

        if (!this.state.isDragging && (dx > 5 || dy > 5)) {
            this.state.isDragging = true;
        }

        if (this.state.isDragging) {
            if (this.state.activeNodeId === 'now') {
                this._handleNowDrag(screenPos);
            } else {
                this._handlePanning(screenPos);
            }
        }
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

        if (!wasDragging) {
            if (this.state.ghostSnap) {
                await this._openDialog('insert', this.state.ghostSnap.world.age, this.state.ghostSnap.world.time);
            }
            return;
        }

        if (this.state.activeNodeId === 'now' && this.state.mode) {
            this.state.isPending = true;
            this.viewport._interaction.isPending = true;
            await this._openDialog('log', this.state.currentWorld.age, this.state.currentWorld.time, this.state.mode === 'span');
        } else {
            this._resetInteraction();
        }
    }

    async onRightClick(event, screenPos) {
        if (this.state.isPending) return;

        const targetNodeId = event.target.dataset.eventId;
        if (!targetNodeId || targetNodeId === 'now') return;

        const node = this.viewport.latestHistory.find(n => n.id === targetNodeId);
        if (!node) return;

        this.state.isPending = true;
        this.viewport._interaction.isPending = true;
        
        await this._openDialog('edit', node.x, node.y, node.record.isSpan, node);
    }

    async _openDialog(mode, age, time, isSpan = false, existingData = null) {
        const { openEventNodeDialog } = await import('../../span-graph-ui-dialogs.js');
        const dt = convertTimestampToDateString(time);
        
        await openEventNodeDialog(this.actor.sheet, {
            mode, ageRaw: age, timeRaw: time, date: dt.date, time: dt.time, isSpan,
            startWorld: this.state.startWorld,
            existingData,
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
            activeNodeId: null, currentWorld: null, startWorld: null
        };
    }

    _generateHUD(world, mode, lore) {
        const dt = convertTimestampToDateString(world.time);
        const rows = [
            { label: 'ACTION', value: mode === 'level' ? 'LEVELING' : 'SPANNING', color: mode === 'level' ? '#00e5ff' : '#ff00ff' },
            { label: 'AGE', value: formatSubjectiveAge(world.age) },
            { label: 'DATE', value: dt.date }
        ];

        if (mode === 'span') {
            const validation = validateSpanPhysics({ y: this.state.startWorld.time, arrivalY: world.time, record: { isSpan: true } }, lore);
            if (!validation.isValid) {
                rows[0] = { label: 'ILLEGAL', value: 'LEVEL BREATH', color: '#ff0000' };
                rows.push({ label: 'ERROR', value: 'SPAN AFTER SPAN', color: '#ff0000' });
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
        const node = this.viewport.latestHistory.find(n => n.id === nodeId);
        if (!node) return;
        const dt = convertTimestampToDateString(node.y);
        this.viewport.tooltipManager.show([
            { label: 'EVENT', value: node.record.title || 'Unknown', color: '#00e5ff' },
            { label: 'AGE', value: formatSubjectiveAge(node.x) },
            { label: 'DATE', value: dt.date }
        ], screenPos);
    }
}
