import { setupInteractions as setup } from './interactions/setup-interactions.js';

/**
 * Character Relationship Interactions Domain
 * Refactored into Atomic Units per the ALF Protocol.
 */

/**
 * Orchestrator: Sets up all user interactions for the character relationship graph.
 * Redirects to the atomic setup service.
 */
export function setupInteractions(params) {
    return setup(params);
}
