import { prepareCharRelationshipData as prepare } from './data/prepare-char-relationship-data.js';

/**
 * Character Relationship Data Domain
 * Refactored into Atomic Units per the ALF Protocol.
 */

/**
 * Orchestrator: Prepares character-centric relationship data.
 * Redirects to the atomic preparation service.
 */
export function prepareCharRelationshipData(sheet) {
    return prepare(sheet);
}
