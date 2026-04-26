import { resolveCoordinates } from './resolve-coordinates.js';

/**
 * ENGINE UNIT: PROJECT NODES
 * Maps physical nodes to their rail positions and calculates displacement.
 * ENFORCES: Physical Alignment (Ensures nodes sit on their segments).
 */
export function projectNodes(physicalHistory, segments) {
    let totalDisplacement = 0;

    const nodes = physicalHistory.map(node => {
        let activeSegment = segments.find(s => s.exitPoint?.id === node.id);
        if (!activeSegment) {
            activeSegment = segments.find(s => s.nodes.some(n => n.id === node.id)) || segments[0];
        }
        
        const x = Number(node.x);
        
        // AUTHORITY: For level events, we align 'y' to the rail defined by the segment.
        // This ensures the 30-degree visual consistency.
        const y = node.id === 'now' ? node.y : resolveCoordinates(x, activeSegment);
        
        const isSpan = Boolean(node.record?.isSpan || node.isSpanOrigin);
        const arrivalY = isSpan ? Number(node.arrivalY || node.y) : y;

        if (isSpan) totalDisplacement += Math.abs(arrivalY - y);

        return {
            ...node, 
            x, 
            y, 
            arrivalY,
            isSpanOrigin: isSpan,
            spanDirection: isSpan ? (arrivalY > y ? 'up' : 'down') : null
        };
    });

    return { nodes, totalDisplacement };
}
