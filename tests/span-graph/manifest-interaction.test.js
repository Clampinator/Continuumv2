import { describe, it, expect, vi } from 'vitest';
import { generateManifest } from '../../modules/span-graph/projection/manifest-generator.js';

describe('Manifest Generator: Interaction Layer', () => {
    const mockViewport = {
        container: { getBoundingClientRect: () => ({ width: 1000, height: 600 }) },
        worldToScreen: vi.fn((x, y) => ({ x: x * 10, y: y * 10 })),
        actor: {
            system: {
                eras: {}
            }
        }
    };

    const mockState = {
        segments: [],
        nodes: [],
        eras: []
    };

    it('should include a ghost node in manifest.interaction when ghostSnap exists', () => {
        const interaction = {
            ghostSnap: {
                screen: { x: 100, y: 200 },
                world: { age: 10, time: 5000 }
            }
        };

        const manifest = generateManifest(mockState, mockViewport, interaction);

        expect(manifest.interaction).toBeDefined();
        expect(manifest.interaction.ghost).toEqual({ x: 100, y: 200 });
    });

    it('should omit the ghost node from manifest.interaction when ghostSnap is missing', () => {
        const interaction = {
            ghostSnap: null
        };

        const manifest = generateManifest(mockState, mockViewport, interaction);

        // Based on the spec: "omit the ghost key entirely if no snap exists"
        if (manifest.interaction) {
            expect(manifest.interaction.ghost).toBeUndefined();
        }
    });

    it('should omit manifest.interaction if interaction param is null', () => {
        const manifest = generateManifest(mockState, mockViewport, null);
        expect(manifest.interaction).toEqual({});
    });

    describe('lastRealEvent on manifest.hud', () => {
        it('should expose the last real event node when history nodes exist', () => {
            const lastNode = {
                id: 'evt-3',
                x: 30,
                y: 3000,
                isVirtual: false,
                record: { eventIsSpan: false, eventTitle: 'Arrival' }
            };
            const state = {
                segments: [],
                nodes: [
                    { id: 'birth', x: 0, y: 0, isVirtual: false, record: {} },
                    { id: 'evt-1', x: 10, y: 1000, isVirtual: false, record: {} },
                    { id: 'evt-2', x: 20, y: 2000, isVirtual: false, record: {} },
                    lastNode,
                    { id: 'now', x: 30, y: 3000 }
                ],
                eras: [],
                nowNode: { id: 'now', x: 30, y: 3000 }
            };
            const manifest = generateManifest(state, mockViewport, null);
            expect(manifest.hud.lastRealEvent).toBeTruthy();
            // The last non-virtual, non-now node should be selected
            const realNodes = state.nodes.filter(n => !n.isVirtual && n.id !== 'now');
            expect(manifest.hud.lastRealEvent?.id).toBe(realNodes[realNodes.length - 1].id);
        });

        it('should set lastRealEvent to null when no history nodes exist', () => {
            const emptyState = {
                segments: [],
                nodes: [{ id: 'now', x: 0, y: 0 }],
                eras: []
            };
            const manifest = generateManifest(emptyState, mockViewport, null);
            expect(manifest.hud.lastRealEvent).toBeNull();
        });
    });
});
