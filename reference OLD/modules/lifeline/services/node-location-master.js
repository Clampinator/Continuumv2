import { initializeGenesisNode } from './lifeline-engine/initialize-genesis-node.js';

/**
 * THE SWITCHBOARD: Central interface for all physical node placement requests.
 * ONE FUNCTION PER FILE: getNodeLocation.
 * @param {object} params - Parameters for location resolution { type, ...data }.
 * @returns {object|null} The resolved node object.
 */
export function getNodeLocation(params) {
    if (!params || !params.type) return null;

    switch (params.type) {
        case 'origin':
            // LINKAGE: Delegating to the existing verified genesis logic.
            return initializeGenesisNode(params.dobTs);
        default:
            console.warn(`Continuum | node-location-master: Unhandled location type: ${params.type}`);
            return null;
    }
}
