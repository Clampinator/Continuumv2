import { calculateLifelineCoordinates } from './lifeline-engine/calculate-lifeline-coordinates.js';

/*
DEPRECATED: This module is being replaced by the temporal-engine pipeline
(get-temporal-state.js). Do not add new features here. Port existing
callers to the engine pipeline.

The coordinate resolution logic has been extracted to Kernel functions in
modules/temporal-kernel/resolve-event-coordinates.js (H8).
The process-level-event and process-span-event wrappers now delegate
to those Kernel functions and only handle NodeGenerator node construction.
*/

/**
 * The core mapping engine for the Lifeline.
 * Enforces the "Functional Contract" that Age and Time are inextricably linked (1s = 1000ms)
 * for leveling, while Spanning allows Time to change with zero Age delta.
 * 
 * Fragmentation (ALF Protocol):
 * Logic decimated to subfolder lifeline-engine/
 */
export const LifelineEngine = {
    /**
     * Maps events to coordinates using cumulative math.
     * Proxies to atomic orchestration unit.
     */
    calculate: calculateLifelineCoordinates
};
