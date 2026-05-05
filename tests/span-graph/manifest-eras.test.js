import { describe, it, expect, vi } from 'vitest';
import { generateManifest } from '../../modules/span-graph/projection/manifest-generator.js';

describe('Manifest Generator: Era Projection', () => {
    const mockViewport = {
        worldToScreen: vi.fn((x, y) => ({ x: x * 10, y: y * 10 })),
        container: { getBoundingClientRect: () => ({ width: 10000, height: 500 }) },
        actor: null
    };

    it('should project eras from the state array into manifest.eras', () => {
        const state = {
            segments: [],
            nodes: [],
            eras: [
                { id: 'e1', name: 'Era 1', startAge: 0, endAge: 100, duration: 100, color: '#ff0000' },
                { id: 'e2', name: 'Era 2', startAge: 100, endAge: 300, duration: 200, color: '#00ff00' }
            ]
        };

        const manifest = generateManifest(state, mockViewport, null);

        expect(manifest.eras).toHaveLength(2);

        // Era 1: includes new metadata fields
        expect(manifest.eras[0].id).toBe('e1');
        expect(manifest.eras[0].name).toBe('Era 1');
        expect(manifest.eras[0].startAge).toBe(0);
        expect(manifest.eras[0].endAge).toBe(100);
        expect(manifest.eras[0].duration).toBe(100);
        expect(manifest.eras[0].startX).toBe(0);
        expect(manifest.eras[0].width).toBe(1000);
        expect(manifest.eras[0].color).toBe('#ff0000');

        // Era 2
        expect(manifest.eras[1].id).toBe('e2');
        expect(manifest.eras[1].startAge).toBe(100);
        expect(manifest.eras[1].duration).toBe(200);
        expect(manifest.eras[1].startX).toBe(1000);
        expect(manifest.eras[1].width).toBe(2000);
    });

    it('should implement safe fallbacks for missing properties', () => {
        const state = {
            segments: [],
            nodes: [],
            eras: [
                { id: 'broken', name: 'Broken Era', startAge: 0 } // missing duration, color
            ]
        };

        const manifest = generateManifest(state, mockViewport, null);

        expect(manifest.eras[0].width).toBeDefined();
        expect(manifest.eras[0].color).toBeDefined();
        expect(manifest.eras[0].id).toBe('broken');
    });

    it('should gracefully skip if state.eras is missing', () => {
        const state = { segments: [], nodes: [] }; // eras missing
        const manifest = generateManifest(state, mockViewport, null);
        expect(manifest.eras).toEqual([]);
    });

    it('should handle infinity endAge for last era', () => {
        const state = {
            segments: [],
            nodes: [],
            eras: [
                { id: 'forever', name: 'Forever', startAge: 0, endAge: Infinity, duration: 0, color: null }
            ]
        };

        const manifest = generateManifest(state, mockViewport, null);

        expect(manifest.eras[0].startX).toBe(0);
        // Infinity endAge means width = container width (10000)
        expect(manifest.eras[0].width).toBe(10000);
    });
});