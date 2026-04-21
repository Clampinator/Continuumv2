
import { getProtection } from './defender-profile/get-protection.js';
import { degradeArmor } from './defender-profile/degrade-armor.js';
import { applyWounds } from './defender-profile/apply-wounds.js';
import { syncTokenStatus } from './defender-profile/sync-token-status.js';

/**
 * Service to extract and update defensive data on an actor.
 * Decimated into atomic units per the ALF Protocol.
 */
export const DefenderProfile = {
    /**
     * Proxies call to the atomic protection calculation unit.
     */
    getProtection,

    /**
     * Proxies call to the atomic armor degradation unit.
     */
    degradeArmor,

    /**
     * Proxies call to the atomic wound application unit.
     */
    applyWounds,

    /**
     * Proxies call to the atomic token status sync unit.
     */
    syncTokenStatus
};
