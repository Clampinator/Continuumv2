
const SOCKET_NAME = "system.continuum";

/**
 * Registered on the ready hook. The active GM listens for combat update
 * requests from players who do not own the target actor.
 */
export function initCombatSocket() {
    game.socket.on(SOCKET_NAME, async (data) => {
        // Only one GM should process each message
        if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;

        const actor = await fromUuid(data.actorUuid);
        if (!actor) return;

        if (data.type === "applyWounds") {
            await actor.update({
                [`system.combat.wounds.${data.slotKey}`]: {
                    ip: data.ip,
                    type: data.woundType,
                    bleeding: data.bleeding
                }
            });
        }

        if (data.type === "degradeArmor") {
            const armor = actor.system.combat?.armor || {};
            const ipKey = `ip${data.locationCode.toUpperCase()}`;
            const targetArmorId = Object.keys(armor).find(id => (Number(armor[id][ipKey]) || 0) > 0);
            if (targetArmorId) {
                const newVal = Math.max(0, (Number(armor[targetArmorId][ipKey]) || 0) - 1);
                await actor.update({
                    [`system.combat.armor.${targetArmorId}.${ipKey}`]: newVal
                });
            }
        }
    });
}

/**
 * Emits an applyWounds request to the GM via socket.
 */
export function emitApplyWounds(actor, slotKey, ip, woundType, bleeding) {
    game.socket.emit(SOCKET_NAME, {
        type: "applyWounds",
        actorUuid: actor.uuid,
        slotKey,
        ip,
        woundType,
        bleeding
    });
}

/**
 * Emits a degradeArmor request to the GM via socket.
 */
export function emitDegradeArmor(actor, locationCode) {
    game.socket.emit(SOCKET_NAME, {
        type: "degradeArmor",
        actorUuid: actor.uuid,
        locationCode
    });
}
