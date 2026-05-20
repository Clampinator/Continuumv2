import { SPHERE_MAP } from './sphere-visual-registry.js';

/**
 * Maps manual network edges to graph-ready link objects.
 * @param {Actor} actor 
 * @returns {Array}
 */
export function mapNetworkLinks(actor) {
    const rawEdges = Object.values(actor.system.networkEdges || {});
    
    return rawEdges.map(e => {
        const sphere = e.importance || "Professional";
        const props = SPHERE_MAP[sphere] || SPHERE_MAP.default;
        
        return {
            ...e,
            startTime: e.dateFrom ? new Date(e.dateFrom).getTime() : -Infinity,
            endTime: e.dateTo ? new Date(e.dateTo).getTime() : Infinity,
            targetDistance: props.distance,
            linkStrength: props.strength,
            visualWidth: props.width,
            visualOpacity: props.opacity,
            visualColor: props.color
        };
    });
}
