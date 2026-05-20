
import { initializeCharRelationshipGraph as init } from './char-relationship-graph/initialize-char-relationship-graph.js';

/**
 * Character Relationship Graph Domain
 * Orchestrator: Initializes the freeform Relationship Map for characters.
 */
export function initializeCharRelationshipGraph(sheet) {
    return init(sheet);
}
