import { describe, it, expect, vi } from 'vitest';
import { projectNodes } from '../../modules/temporal-engine/project-nodes.js';
import { resolveCoordinates } from '../../modules/temporal-engine/resolve-coordinates.js';

vi.mock('../../modules/temporal-engine/resolve-coordinates.js', () => ({
    resolveCoordinates: vi.fn((x) => x * 100)
}));

describe('projectNodes', () => {
    it('should calculate physical coordinates and displacement', () => {
        const history = [
            { id: 'birth', x: 0, y: 0, sort: 1000 },
            { id: 'e1', x: 10, sort: 2000 },
            { id: 'span1', x: 20, y: 2000, arrivalY: 5000, record: { eventIsSpan: true }, sort: 3000 },
            { id: 'now', x: 30, y: 8000, isSpanOrigin: true } // Mocked as spanning
        ];
        const segments = [
            { startX: 0, startY: 0, nodes: [history[1]], exitPoint: history[2] },
            { startX: 20, startY: 5000, nodes: [history[3]], exitPoint: null }
        ];

        const { nodes, totalDisplacement } = projectNodes(history, segments);

        expect(nodes).toHaveLength(4);
        
        // e1 projection
        expect(nodes[1].x).toBe(10);
        expect(nodes[1].y).toBe(1000); // resolveCoordinates(10, seg0) -> mocked to 1000
        
        // span1 projection
        expect(nodes[2].isSpanOrigin).toBe(true);
        expect(nodes[2].spanDirection).toBe('up'); 
        
        // Displacement: abs(5000 - 2000) = 3000
        expect(totalDisplacement).toBe(3000);
        
        // now node
        expect(nodes[3].id).toBe('now');
        expect(nodes[3].y).toBe(8000); // Should respect vertical position if spanning
    });
});
