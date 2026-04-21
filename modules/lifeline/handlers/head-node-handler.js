import { handleDrag } from './head-node-handler/handle-drag.js';

/**
 * Head Node Handler Domain
 * Refactored into Atomic Units per the ALF Protocol.
 * 
 * Fragmentation Manifest:
 * - handleDrag -> head-node-handler/handle-drag.js
 */

/**
 * Logic handler for the NOW node.
 * Manages the movement through Spacetime and associated UI data.
 */
export const HeadNodeHandler = {
    /**
     * Orchestrator: Processes head node movement based on pointer delta.
     * Proxies call to the atomic handle-drag unit.
     */
    handleDrag
};
