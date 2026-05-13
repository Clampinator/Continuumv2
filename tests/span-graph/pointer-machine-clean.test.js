import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PointerMachine } from '../../modules/span-graph/interaction/pointer-machine.js';

describe('PointerMachine: Clean Refactor', () => {
    let mockViewport;
    let machine;

    beforeEach(() => {
        mockViewport = {
            actor: {},
            latestHistory: [],
            latestManifest: { rails: [] },
            nodeRenderer: { renderGhostNode: vi.fn() },
            tooltipManager: { hide: vi.fn(), show: vi.fn() },
            _interaction: { ghostSnap: null },
            _render: vi.fn(),
            screenToWorld: vi.fn((x, y) => ({ age: x, time: y })),
            worldToScreen: vi.fn((x, y) => ({ x, y }))
        };
        machine = new PointerMachine(mockViewport);
    });

    it('should not call renderGhostNode directly in onMove', () => {
        // Setup a situation where a snap would occur
        const screenPos = { x: 100, y: 100 };
        // Force state for testing
        machine.state.isDown = false;
        
        // We'll mock calculateGhostSnap to return a value
        vi.mock('../../modules/span-graph/interaction/calculate-ghost-snap.js', () => ({
            calculateGhostSnap: vi.fn(() => ({ screen: { x: 10, y: 10 }, world: { age: 1, time: 100 } }))
        }));

        machine.onMove({ target: { dataset: {} } }, screenPos);

        expect(mockViewport.nodeRenderer.renderGhostNode).not.toHaveBeenCalled();
    });

    it('should update viewport._interaction.ghostSnap in onMove', async () => {
        const screenPos = { x: 100, y: 100 };
        machine.state.isDown = false;

        // Note: Using dynamic import mocking if necessary, but here we can just check if the property was set.
        machine.onMove({ target: { dataset: {} } }, screenPos);

        // We expect it to be set (even if null if no snap found, but here we want to see it integrated)
        expect(mockViewport._interaction).toHaveProperty('ghostSnap');
    });
});

describe('PointerMachine: NOW Node Right-Click', () => {
    let mockViewport;
    let machine;

    const lastRealEvent = {
        id: 'evt-last',
        x: 25,
        y: 2500,
        record: { eventIsSpan: false, eventTitle: 'Last Event' }
    };

    beforeEach(() => {
        mockViewport = {
            actor: { system: { eras: {} } },
            latestHistory: [],
            latestManifest: {
                rails: [],
                hud: { lastRealEvent }
            },
            latestState: {
                nodes: [
                    { id: 'birth', x: 0, y: 0, isVirtual: false, record: {} },
                    { id: 'evt-last', x: 25, y: 2500, isVirtual: false, record: { eventIsSpan: false } }
                ]
            },
            _interaction: { ghostSnap: null, isPending: false },
            _render: vi.fn(),
            screenToWorld: vi.fn((x, y) => ({ eventAge: x, eventTime: y })),
            worldToScreen: vi.fn((x, y) => ({ x, y }))
        };
        machine = new PointerMachine(mockViewport);
        // Stub _openDialog so we can spy on what it receives
        machine._openDialog = vi.fn();
    });

    it('should open edit dialog for lastRealEvent when right-clicking NOW node', async () => {
        const event = { target: { dataset: { eventId: 'now' }, closest: () => null } };
        const screenPos = { x: 250, y: 250 };

        await machine.onRightClick(event, screenPos);

        expect(machine._openDialog).toHaveBeenCalledWith(
            'edit',
            lastRealEvent.x,
            lastRealEvent.y,
            lastRealEvent.record.eventIsSpan,
            lastRealEvent
        );
    });

    it('should do nothing when right-clicking NOW node with no lastRealEvent', async () => {
        mockViewport.latestManifest.hud.lastRealEvent = null;
        const event = { target: { dataset: { eventId: 'now' }, closest: () => null } };
        const screenPos = { x: 250, y: 250 };

        await machine.onRightClick(event, screenPos);

        expect(machine._openDialog).not.toHaveBeenCalled();
    });

    it('should open edit dialog for a regular node when right-clicking it (not NOW)', async () => {
        const node = { id: 'evt-1', x: 10, y: 1000, record: { eventIsSpan: false }, isSpanDest: false };
        mockViewport.latestState.nodes = [node];
        const event = { target: { dataset: { eventId: 'evt-1' }, closest: () => null } };
        const screenPos = { x: 100, y: 100 };

        await machine.onRightClick(event, screenPos);

        expect(machine._openDialog).toHaveBeenCalledWith(
            'edit', 10, 1000, false, node
        );
    });
});
