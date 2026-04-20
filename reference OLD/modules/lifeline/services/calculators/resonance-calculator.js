import { calculateResonanceBonuses } from '/systems/continuum/modules/lifeline/services/calculators/resonance-calculator/calculate-resonance-bonuses.js';

/**
 * Resonance Calculator Domain
 * Refactored into Atomic Units per the ALF Protocol.
 */
export const ResonanceCalculator = {
    /**
     * Orchestrator: Proxies call to the atomic calculation service.
     */
    calculate: calculateResonanceBonuses
};