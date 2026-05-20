
/**
 * Updates token status icons based on current actor health/wounds.
 * @param {Actor} actor
 */
export async function syncTokenStatus(actor) {
    const wounds = Object.values(actor.system.combat?.wounds || {});
    const hasWounds = wounds.some(w => (Number(w.ip) || 0) > 0);
    const isBleeding = wounds.some(w => !!w.bleeding);

    const validStatusIds = new Set(CONFIG.statusEffects.map(e => e.id));

    const tokens = actor.getActiveTokens();
    for (const token of tokens) {
        if (validStatusIds.has('wounded')) {
            await token.document.toggleActiveEffect({ id: "wounded", icon: "icons/svg/blood.svg" }, { active: hasWounds });
        }
        if (isBleeding && validStatusIds.has('bleeding')) {
            await token.document.toggleActiveEffect({ id: "bleeding", icon: "icons/svg/droplet.svg" }, { active: true });
        }
    }
}
