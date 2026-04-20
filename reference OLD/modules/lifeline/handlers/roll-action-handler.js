import { performRollAction } from './roll-action-handler/perform-roll-action.js';

/**
 * Roll Action Handler Domain
 * Refactored into Atomic Units per the ALF Protocol.
 * 
 * Fragmentation Manifest:
 * - execute -> roll-action-handler/perform-roll-action.js
 */

/**
 * Executes the final Foundry Roll and dispatches results to chat.
 */
export const RollActionHandler = {
    /**
     * Proxies call to the atomic perform-roll-action unit.
     */
    execute: performRollAction
};