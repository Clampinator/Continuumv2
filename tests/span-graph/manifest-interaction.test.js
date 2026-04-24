import { describe, it, expect, vi } from 'vitest';
import { generateManifest } from '../../modules/span-graph/projection/manifest-generator.js';

describe('Manifest Generator: Interaction Layer', () => {
    const mockViewport = {
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
});
