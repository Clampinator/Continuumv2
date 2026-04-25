import { resolveCoordinates } from './resolve-coordinates.js';

/**
 * ENGINE UNIT: PROJECT NODES
 * Calculates physical world coordinates for all nodes in history.
 * ENFORCES: Single Responsibility (Coordinate resolution).
 */
export function projectNodes(history, segments) {
    let totalDisplacement = 0;

    const nodes = history.map(node => {
        let activeSegment = segments.find(s => s.exitPoint?.id === node.id);
        if (!activeSegment) {
            activeSegment = segments.find(s => s.nodes.some(n => n.id === node.id)) || segments[0];
        }
        
        const authoritativeX = Number(node.x);
        const authoritativeY = node.id === 'now' ? node.y : resolveCoordinates(authoritativeX, activeSegment);
        
        const isSpan = Boolean(node.record?.isSpan);
        const arrivalY = isSpan ? Number(node.arrivalY || node.y) : 0;

        if (isSpan) totalDisplacement += Math.abs(arrivalY - authoritativeY);

        return {
            ...node, x: authoritativeX, y: authoritativeY, arrivalY,
            isSpanOrigin: isSpan,
            spanDirection: isSpan ? (arrivalY > authoritativeY ? 'up' : 'down') : null
        };
    });

    return { nodes, totalDisplacement };
}
