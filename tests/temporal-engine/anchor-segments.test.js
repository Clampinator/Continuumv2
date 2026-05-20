import { describe, it, expect } from 'vitest';
import { anchorSegments } from '../../modules/temporal-engine/anchor-segments.js';

describe('anchorSegments', () => {
    it('should create virtual anchors and link nodes to segments', () => {
        const nodesWithProjection = [
            { id: 'birth', x: 0, y: 1000 },
            { id: 'e1', x: 10, y: 1000 },
            { id: 'span1', x: 20, y: 1000, spanDirection: 'up' },
            { id: 'now', x: 30, y: 5000 }
        ];
        const segments = [
            { startX: 0, startY: 1000, nodes: [{id: 'e1'}], exitPoint: {id: 'span1'} },
            { startX: 20, startY: 5000, nodes: [{id: 'now'}], exitPoint: null }
        ];

        const projectedSegments = anchorSegments(segments, nodesWithProjection);

        expect(projectedSegments).toHaveLength(2);
        
        // Segment 0: Birth
        expect(projectedSegments[0].arrivalNode.isBirth).toBe(true);
        expect(projectedSegments[0].arrivalNode.isSpanDest).toBe(false);
        expect(projectedSegments[0].nodes[0].id).toBe('e1');

        // Segment 1: Arrival
        expect(projectedSegments[1].arrivalNode.isBirth).toBe(false);
        expect(projectedSegments[1].arrivalNode.isSpanDest).toBe(true);
        expect(projectedSegments[1].arrivalNode.spanDirection).toBe('up');
        expect(projectedSegments[1].nodes[0].id).toBe('now');
    });
});
