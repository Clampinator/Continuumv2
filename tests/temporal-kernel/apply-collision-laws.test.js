import { describe, it, expect } from 'vitest';
import { applyCollisionLaws } from '../../modules/temporal-kernel/apply-collision-laws.js';

describe('applyCollisionLaws', () => {
    it('should add virtual anchors that do not collide', () => {
        const physicalNodes = [
            { id: 'e1', x: 10, y: 1000 }
        ];
        const virtualAnchors = [
            { id: 'v1', x: 20, y: 2000, isSpanDest: true, spanDirection: 'up' }
        ];

        const result = applyCollisionLaws(physicalNodes, virtualAnchors);
        expect(result).toHaveLength(2);
        expect(result.some(n => n.id === 'e1')).toBe(true);
        expect(result.some(n => n.id === 'v1')).toBe(true);
    });

    it('should merge virtual anchors into colliding physical nodes', () => {
        const physicalNodes = [
            { id: 'e1', x: 10, y: 1000 }
        ];
        const virtualAnchors = [
            { id: 'v1', x: 10.05, y: 1050, isSpanDest: true, spanDirection: 'up' }
        ];

        const result = applyCollisionLaws(physicalNodes, virtualAnchors);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('e1');
        expect(result[0].isSpanDest).toBe(true);
        expect(result[0].spanDirection).toBe('up');
    });

    it('should prioritize Birth properties during collision', () => {
        const physicalNodes = [
            { id: 'e1', x: 0, y: 0 }
        ];
        const virtualAnchors = [
            { id: 'v1', x: 0, y: 0, isBirth: true }
        ];

        const result = applyCollisionLaws(physicalNodes, virtualAnchors);
        expect(result[0].isBirth).toBe(true);
    });

    it('should ensure span destinations "swallow" regular level events', () => {
        // A regular level event has no special flags initially.
        const physicalNodes = [
            { id: 'level-event', x: 50, y: 5000 }
        ];
        // An arrival anchor at the same location.
        const virtualAnchors = [
            { id: 'arrival', x: 50, y: 5000, isSpanDest: true, spanDirection: 'down' }
        ];

        const result = applyCollisionLaws(physicalNodes, virtualAnchors);
        
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('level-event');
        expect(result[0].isSpanDest).toBe(true);
        expect(result[0].spanDirection).toBe('down');
    });

    it('should ensure span destinations "swallow" span origins', () => {
        const physicalNodes = [
            { id: 'span-origin', x: 60, y: 6000, isSpanOrigin: true, spanDirection: 'up' }
        ];
        const virtualAnchors = [
            { id: 'arrival', x: 60, y: 6000, isSpanDest: true, spanDirection: 'down' }
        ];

        const result = applyCollisionLaws(physicalNodes, virtualAnchors);
        
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('span-origin');
        expect(result[0].isSpanDest).toBe(true);
        expect(result[0].isSpanOrigin).toBe(true);
    });
});
