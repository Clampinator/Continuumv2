import { ReferenceResolver } from '../../reference-resolver.js';

/**
 * Resolves the subjective origin for the resonance calculator.
 * SILO: Resonance Calculator.
 * @param {Actor} actor 
 * @returns {number} Timestamp
 */
export function deriveResonanceOrigin(actor) {
    // Defer to the central resolver to ensure chronological consistency across the system.
    return ReferenceResolver.resolveOrigin(actor);
}