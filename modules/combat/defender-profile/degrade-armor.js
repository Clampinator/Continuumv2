
import { emitDegradeArmor } from '../combat-socket.js';

/**
 * Reduces the armor IP at a specific location by 1.
 * Routes through the GM socket if the current user doesn't own the target.
 * @param {Actor} actor
 * @param {string} locationCode
 * @returns {Promise<boolean>} True if armor was degraded.
 */
export async function degradeArmor(actor, locationCode) {
    if (!actor || !locationCode) return false;

    const canEdit = game.user.isGM || actor.testUserPermission(game.user, "OWNER");

    if (!canEdit) {
        emitDegradeArmor(actor, locationCode);
        return true;
    }

    const armor = actor.system.combat?.armor || {};
    const ipKey = `ip${locationCode.toUpperCase()}`;
    const targetArmorId = Object.keys(armor).find(id => (Number(armor[id][ipKey]) || 0) > 0);

    if (targetArmorId) {
        const newVal = Math.max(0, (Number(armor[targetArmorId][ipKey]) || 0) - 1);
        await actor.update({
            [`system.combat.armor.${targetArmorId}.${ipKey}`]: newVal
        });
        return true;
    }
    return false;
}
