
import { calculateMindPenalty } from './calculate-mind-penalty.js';

/**
 * Calculates base target including wound penalties based on actor type.
 * For meta keys, the base is highestMetaRank + activeRank where
 * highestMetaRank is derived from actor data and activeRank is the
 * selected metability's current rank.
 * @param {Actor} actor
 * @param {string} key - Attribute or system key.
 * @param {object} [options] - Optional parameters.
 * @param {number} [options.activeRank] - Active rank for meta rolls.
 * @returns {number} Strictly floored integer.
 */
export function calculateBaseTarget(actor, key, options = {}) {
    let base = 0;
    if (!key) return 0;
    
    if (key.startsWith('meta-')) {
        const metas = actor.system.metabilities;
        const highestRank = Math.max(
            Number(metas.coercion?.value) || 0,
            Number(metas.creativity?.value) || 0,
            Number(metas.farsense?.value) || 0,
            Number(metas.pk?.value) || 0,
            Number(metas.redaction?.value) || 0
        );
        base = highestRank + (Number(options.activeRank) || 0);
    } else if (key === 'spanning') {
        const react = Number(foundry.utils.getProperty(actor.system, 'attributes.react.value')) || 0;
        const span = Number(foundry.utils.getProperty(actor.system, 'spanning.span')) || 0;
        base = react + span;
    } else if (key === 'naturalSpan') {
        const react = Number(foundry.utils.getProperty(actor.system, 'attributes.react.value')) || 0;
        const natSpan = Number(foundry.utils.getProperty(actor.system, 'spanning.naturalSpan')) || 0;
        base = react + natSpan;
    } else if (key === 'willpowerTemp') {
        base = Number(foundry.utils.getProperty(actor.system, 'attributes.willpower.temp')) || 0;
    } else if (key === 'willpowerPerm') {
        base = Number(foundry.utils.getProperty(actor.system, 'attributes.willpower.perm')) || 0;
    } else {
        base = Number(foundry.utils.getProperty(actor.system, `attributes.${key}.value`)) || 0;
    }

    // Apply Analyze penalty for running applications
    if (key === 'analyze' || key === 'mind') {
        base += calculateMindPenalty(actor);
    }

    // Apply wound penalties based on actor type
    let ipPenalty = 0;
    if (actor.type === 'character') {
        const wounds = actor.system.combat?.wounds ?? {};
        ipPenalty = Object.values(wounds).reduce((total, wound) => total + (Number(wound.ip) || 0), 0);
    } else if (actor.type === 'organization') {
        const wounds = actor.system.conflict?.wounds ?? {};
        // For Orgs, RIP (Real Integrity Points) penalize actions
        ipPenalty = Object.values(wounds).reduce((total, wound) => total + (Number(wound.rip) || 0), 0);
    }
    
    return Math.floor(base - ipPenalty);
}
