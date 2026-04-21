import { calculateLifelineCoordinates } from './lifeline-engine/calculate-lifeline-coordinates.js';

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
