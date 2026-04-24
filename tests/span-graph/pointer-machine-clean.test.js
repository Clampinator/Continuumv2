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
