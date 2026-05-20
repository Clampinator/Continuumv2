
/**
 * Calculates the total protection (IP) for a specific hit location.
 * @param {Actor} actor - The defender actor.
 * @param {string} locationCode - A-G.
 * @returns {number}
 */
export function getProtection(actor, locationCode) {
    if (!actor || !locationCode) return 0;
    
    const armor = actor.system.combat?.armor || {};
    const ipKey = `ip${locationCode.toUpperCase()}`;
    
    return Object.values(armor).reduce((total, item) => {
        return total + (Number(item[ipKey]) || 0);
    }, 0);
}
