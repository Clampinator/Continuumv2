import { describe, it, expect, vi } from 'vitest';
import { generateManifest } from '../../modules/span-graph/projection/manifest-generator.js';

describe('Manifest Generator: Era Projection', () => {
    const mockViewport = {
        worldToScreen: vi.fn((x, y) => ({ x: x * 10, y: y * 10 })),
        actor: null // MANDATE: No actor access
    };

    it('should project eras from the state array into manifest.eras', () => {
        const state = {
            segments: [],
            nodes: [],
            eras: [
                { name: 'Era 1', startAge: 0, duration: 100, color: '#ff0000' },
                { name: 'Era 2', startAge: 100, duration: 200, color: '#00ff00' }
            ]
        };

        const manifest = generateManifest(state, mockViewport, null);

        expect(manifest.eras).toHaveLength(2);
        
        // Era 1: start 0 * 10 = 0, width 100 * 10 = 1000
        expect(manifest.eras[0]).toEqual({
            name: 'Era 1',
            startX: 0,
            width: 1000,
            color: '#ff0000'
        });

        // Era 2: start 100 * 10 = 1000, width 200 * 10 = 2000
        expect(manifest.eras[1]).toEqual({
            name: 'Era 2',
            startX: 1000,
            width: 2000,
            color: '#00ff00'
        });
    });

    it('should implement safe fallbacks for missing properties', () => {
        const state = {
            segments: [],
            nodes: [],
            eras: [
                { name: 'Broken Era', startAge: 0 } // missing duration, color
            ]
        };

        const manifest = generateManifest(state, mockViewport, null);

        expect(manifest.eras[0].width).toBeDefined();
        expect(manifest.eras[0].color).toBeDefined();
    });

    it('should gracefully skip if state.eras is missing', () => {
        const state = { segments: [], nodes: [] }; // eras missing
        const manifest = generateManifest(state, mockViewport, null);
        expect(manifest.eras).toEqual([]);
    });
});
