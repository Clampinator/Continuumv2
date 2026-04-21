
import { syncTokenStatus } from './sync-token-status.js';
import { emitApplyWounds } from '../combat-socket.js';

/**
 * Applies damage to the defender's wounds track.
 * Routes through the GM socket if the current user doesn't own the target.
 * @param {Actor} actor
 * @param {number} ip
 * @param {string} type
 * @returns {Promise<boolean>}
 */
export async function applyWounds(actor, ip, type) {
    if (!actor || !ip) return false;

    const wounds = actor.system.combat?.wounds || {};
    let slotKey = null;
    for (let i = 0; i < 5; i++) {
        if ((Number(wounds[i]?.ip) || 0) === 0) {
            slotKey = i;
            break;
        }
    }

    if (slotKey === null) {
        ui.notifications.warn(`${actor.name} has no more wound slots available!`);
        return false;
    }

    const bleeding = type === 'Lethal';
    const canEdit = game.user.isGM || actor.testUserPermission(game.user, "OWNER");

    if (canEdit) {
        await actor.update({
            [`system.combat.wounds.${slotKey}`]: { ip, type, bleeding }
        });
        await syncTokenStatus(actor);
    } else {
        emitApplyWounds(actor, slotKey, ip, type, bleeding);
    }

    return true;
}
