import { describe, it, expect, vi } from 'vitest';
import { generateManifest } from '../../modules/span-graph/projection/manifest-generator.js';

describe('Manifest Generator: Rest Rails and Nodes', () => {
    const mockViewport = {
        worldToScreen: vi.fn((x, y) => ({ x: x * 10, y: y })),
        actor: {
            system: {
                eras: {}
            }
        },
        container: {
            getBoundingClientRect: vi.fn(() => ({ width: 1000, height: 500 }))
        }
    };

    it('should produce a rest rail segment when a segment contains an isRest node followed by a rest-end node', () => {
        const state = {
            segments: [{
                startX: 0,
                startY: 0,
                nodes: [
                    { id: 'evt-rest', x: 86400, y: 100000, isRest: true, record: { eventTitle: 'Rest' } },
                    { id: 'evt-restend', x: 172800, y: 200000, isRestEnd: true, record: { eventTitle: 'End of Rest' } }
                ],
                exitPoint: null,
                arrivalNode: { id: 'arrival-0-0', x: 0, y: 0, isVirtual: true }
            }],
            nodes: [
                { id: 'arrival-0-0', x: 0, y: 0, isVirtual: true, isBirth: true, record: { eventTitle: 'Birth' } },
                { id: 'evt-rest', x: 86400, y: 100000, isRest: true, isRestEnd: false, record: { eventTitle: 'Rest' } },
                { id: 'evt-restend', x: 172800, y: 200000, isRest: false, isRestEnd: true, record: { eventTitle: 'End of Rest' } }
            ],
            eras: []
        };

        const manifest = generateManifest(state, mockViewport, null);

        const restRails = manifest.rails.filter(r => r.type === 'rest');
        expect(restRails.length).toBeGreaterThanOrEqual(1);

        const restRail = restRails[0];
        expect(restRail.p1).toBeDefined();
        expect(restRail.p2).toBeDefined();
    });

    it('should produce rest and rest-end node types from manifest', () => {
        const state = {
            segments: [{
                startX: 0,
                startY: 0,
                nodes: [
                    { id: 'evt-rest', x: 86400, y: 100000, isRest: true, isRestEnd: false, record: { eventTitle: 'Rest' } },
                    { id: 'evt-restend', x: 172800, y: 200000, isRest: false, isRestEnd: true, record: { eventTitle: 'End of Rest' } }
                ],
                exitPoint: null,
                arrivalNode: { id: 'arrival-0-0', x: 0, y: 0, isVirtual: true }
            }],
            nodes: [
                { id: 'arrival-0-0', x: 0, y: 0, isVirtual: true, isBirth: true, record: { eventTitle: 'Birth' } },
                { id: 'evt-rest', x: 86400, y: 100000, isRest: true, isRestEnd: false, record: { eventTitle: 'Rest' } },
                { id: 'evt-restend', x: 172800, y: 200000, isRest: false, isRestEnd: true, record: { eventTitle: 'End of Rest' } }
            ],
            eras: []
        };

        const manifest = generateManifest(state, mockViewport, null);

        const restNode = manifest.nodes.find(n => n.id === 'evt-rest');
        const restEndNode = manifest.nodes.find(n => n.id === 'evt-restend');
        expect(restNode.type).toBe('rest');
        expect(restEndNode.type).toBe('rest-end');
    });

    it('should not produce rest rail when rest node is last in railNodes with no next node', () => {
        const state = {
            segments: [{
                startX: 0,
                startY: 0,
                nodes: [
                    { id: 'evt-rest', x: 86400, y: 100000, isRest: true, record: { eventTitle: 'Rest' } }
                ],
                exitPoint: null,
                arrivalNode: { id: 'arrival-0-0', x: 0, y: 0, isVirtual: true }
            }],
            nodes: [
                { id: 'arrival-0-0', x: 0, y: 0, isVirtual: true, isBirth: true, record: { eventTitle: 'Birth' } },
                { id: 'evt-rest', x: 86400, y: 100000, isRest: true, record: { eventTitle: 'Rest' } }
            ],
            eras: []
        };

        const manifest = generateManifest(state, mockViewport, null);

        const restRails = manifest.rails.filter(r => r.type === 'rest');
        expect(restRails.length).toBe(0);
    });

    it('should produce rest rail from rest node to next rail node when followed by a level event', () => {
        const state = {
            segments: [{
                startX: 0,
                startY: 0,
                nodes: [
                    { id: 'evt-rest', x: 86400, y: 100000, isRest: true, record: { eventTitle: 'Rest' } },
                    { id: 'evt-level', x: 172800, y: 200000, record: { eventTitle: 'Level' } }
                ],
                exitPoint: null,
                arrivalNode: { id: 'arrival-0-0', x: 0, y: 0, isVirtual: true }
            }],
            nodes: [
                { id: 'arrival-0-0', x: 0, y: 0, isVirtual: true, isBirth: true, record: { eventTitle: 'Birth' } },
                { id: 'evt-rest', x: 86400, y: 100000, isRest: true, record: { eventTitle: 'Rest' } },
                { id: 'evt-level', x: 172800, y: 200000, record: { eventTitle: 'Level' } }
            ],
            eras: []
        };

        const manifest = generateManifest(state, mockViewport, null);

        const restRails = manifest.rails.filter(r => r.type === 'rest');
        expect(restRails.length).toBe(1);

        const restRail = restRails[0];
        expect(restRail.p1).toBeDefined();
        expect(restRail.p2).toBeDefined();
    });
});