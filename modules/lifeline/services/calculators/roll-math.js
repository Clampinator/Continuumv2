
import { calculateBaseTarget } from './roll-math/calculate-base-target.js';
import { calculateQuickPenalty } from './roll-math/calculate-quick-penalty.js';
import { calculateMindPenalty } from './roll-math/calculate-mind-penalty.js';

/**
 * Pure math service for roll targets.
 * Decimated into atomic units per the ALF Protocol.
 */
export const RollMath = {
    /**
     * Proxies call to the atomic target calculation unit.
     */
    calculateBaseTarget,

    /**
     * Proxies call to the atomic penalty calculation unit.
     */
    getQuickPenalty: calculateQuickPenalty,

    /**
     * Proxies call to the atomic mind penalty calculation unit.
     */
    getMindPenalty: calculateMindPenalty
};
