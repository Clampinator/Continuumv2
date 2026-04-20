import { findOverlappingExperiences } from './context-finder-logic/find-overlapping-experiences.js';
import { isEndedOn } from './context-finder-logic/is-ended-on.js';
import { getHitContext } from './context-finder-logic/get-hit-context.js';

/**
 * Service to identify relevant experiences or Ages at specific spatial/temporal coordinates.
 * Fragmented per ALF Protocol into a dedicated logic subfolder.
 */
export const ContextFinder = {
    findOverlappingExperiences,
    isEndedOn,
    getHitContext
};