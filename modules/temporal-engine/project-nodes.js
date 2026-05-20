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
        
        // AUTHORITY: Projection determines the physical "snap" to the rail.
        // RULE: If the node is currently Spanning (including a live NOW drag), 
        // we MUST NOT override its Y coordinate, as vertical displacement IS the intent.
        const eventIsSpan = Boolean(node.record?.eventIsSpan || node.isSpanOrigin);
        
        const y = (node.id === 'now' && eventIsSpan) 
            ? node.y 
            : resolveCoordinates(x, activeSegment);
        
        const arrivalY = eventIsSpan ? Number(node.arrivalY || node.y) : y;

        if (eventIsSpan) totalDisplacement += Math.abs(arrivalY - y);

        return {
            ...node, 
            x, 
            y, 
            arrivalY,
            isSpanOrigin: eventIsSpan,
            spanDirection: eventIsSpan ? (arrivalY > y ? 'up' : 'down') : null
        };
    });

    return { nodes, totalDisplacement };
}
