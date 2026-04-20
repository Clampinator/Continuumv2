import { processHoverState } from './hover-handler/process-hover-state.js';

/**
 * Hover Handler Domain
 * Refactored into Atomic Units per the ALF Protocol.
 * 
 * Fragmentation Manifest:
 * - handle -> hover-handler/process-hover-state.js
 */

/**
 * Logic for processing hover states on the graph.
 */
export const HoverHandler = {
    /**
     * Orchestrator: Processes mouse movement to detect hits on past timeline segments.
     * Proxies call to the atomic process-hover-state unit.
     */
    handle: processHoverState
};