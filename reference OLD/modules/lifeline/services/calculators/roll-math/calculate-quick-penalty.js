
import { ITEM_DATA } from '../../../../../item-data.js';

/**
 * THE ENCUMBRANCE AUTHORITY: Unified Quick Penalty Calculation.
 * Calculates armor and physical weight penalties for Quick/Spanning.
 * 
 * LITERAL CONSTRAINTS:
 * 1. Factors in Max IP of any location for each Armor item MULTIPLIED by the encumbrance multiplier.
 * 2. Factors in physical weight of Gear items marked as 'carried'.
 * 3. Factors in physical weight of Ranged Weapons marked as 'carried'.
 * 4. Factors in physical weight of Melee Weapons marked as 'carried'.
 * 5. Multiplier Rule: 1.0 = standard weight (Max IP), 0.0 = weightless, <1.0 = tech-reduced, <0.0 = gravity-defying.
 * 
 * @param {Actor} actor - The actor document.
 * @returns {number} Floored integer representing the penalty to Quick/Spanning.
 */
export function calculateQuickPenalty(actor) {
    if (!actor || actor.type !== 'character') return 0;

    // 1. Armor Contribution: Max IP * Encumbrance Multiplier
    const armorItems = actor.system.combat?.armor || {};
    const armorLoad = Object.values(armorItems).reduce((total, armor) => {
        const itemMaxIp = Math.max(
            Number(armor.ipA) || 0,
            Number(armor.ipB) || 0,
            Number(armor.ipC) || 0,
            Number(armor.ipD) || 0,
            Number(armor.ipE) || 0,
            Number(armor.ipF) || 0,
            Number(armor.ipG) || 0
        );
        
        // ENCUMBRANCE AS MULTIPLIER:
        // We look for a live value, then a database fallback. 
        // 0 is now a valid multiplier (weightless). We only default to 1.0 if the value is NaN.
        let multiplier = parseFloat(armor.encumbrance);
        
        if (isNaN(multiplier)) {
            const dbEntry = ITEM_DATA.armor[armor.name] || {};
            multiplier = parseFloat(dbEntry.encumbrance);
        }
        
        // Final fallback for missing data
        if (isNaN(multiplier)) multiplier = 1.0;

        return total + (itemMaxIp * multiplier);
    }, 0);

    // 2. Physical Weight Contribution (kg)
    let weightLoad = 0;

    // A. Embedded Gear items
    const carriedGear = actor.items.filter(i => i.type === 'gear' && i.system.carried);
    weightLoad += carriedGear.reduce((total, i) => {
        const w = Number(i.system.weight) || 0;
        const q = Number(i.system.quantity) || 1;
        return total + (w * q);
    }, 0);

    // B. Ranged Weapons from system data
    const rangedWeapons = Object.values(actor.system.combat?.rangedWeapons || {});
    weightLoad += rangedWeapons.reduce((total, w) => {
        if (!w.carried) return total;
        const dbWeight = ITEM_DATA.rangedWeapons[w.name]?.weight || 0;
        return total + (Number(w.weight) || dbWeight);
    }, 0);

    // C. Melee Weapons from system data
    const meleeWeapons = Object.values(actor.system.combat?.meleeWeapons || {});
    weightLoad += meleeWeapons.reduce((total, w) => {
        if (!w.carried) return total;
        const dbWeight = ITEM_DATA.meleeWeapons[w.name]?.weight || 0;
        return total + (Number(w.weight) || dbWeight);
    }, 0);

    // 3. Body Mitigation
    const body = Number(foundry.utils.getProperty(actor.system, 'attributes.body.value')) || 0;
    const totalLoad = armorLoad + weightLoad;

    return Math.floor(Math.max(0, totalLoad - body));
}
