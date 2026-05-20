import { resolveOrigin as resolve } from './reference-resolver/resolve-origin.js';

/**
 * Logic for determining the origin point (DOB/Inception) of a Lifeline.
 */
export const ReferenceResolver = {
    /**
     * Finds the base timestamp for the graph origin.
     * Enforces numeric stability.
     */
    resolveOrigin(actor) {
        return resolve(actor);
    }
};
