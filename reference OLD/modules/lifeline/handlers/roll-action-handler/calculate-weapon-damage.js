/**
 * Looks up a weapon's base damage based on hit location.
 * @param {Actor} actor 
 * @param {string} weaponId 
 * @param {string} weaponType - 'melee' or 'ranged'
 * @param {string} locationCode - A-G
 * @returns {object} { name, damage }
 */
export function calculateWeaponDamage(actor, weaponId, weaponType, locationCode) {
    const weaponData = weaponType === 'melee' 
        ? actor.system.combat?.meleeWeapons?.[weaponId] 
        : actor.system.combat?.rangedWeapons?.[weaponId];

    if (!weaponData) return { name: null, damage: null };

    let baseDamage = 0;
    if (weaponType === 'melee') {
        baseDamage = Number(weaponData.damage) || 0;
    } else if (locationCode) {
        const dmgKey = `damage${locationCode.toUpperCase()}`;
        baseDamage = Number(weaponData[dmgKey]) || 0;
    }
    
    return {
        name: weaponData.name,
        damage: Math.floor(baseDamage)
    };
}