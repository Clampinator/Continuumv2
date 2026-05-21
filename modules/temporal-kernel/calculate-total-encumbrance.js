/**
 * Computes total encumbrance: armor + carried gear + carried weapons.
 * @param {object[]} armorItems - Armor item objects, each with encumbrance and name fields.
 * @param {object[]} rangedWeapons - Ranged weapon objects with carried, weight, and name fields.
 * @param {object[]} meleeWeapons - Melee weapon objects with carried, weight, and name fields.
 * @param {number} totalGearWeight - Pre-computed total weight of carried gear items.
 * @param {object} armorItemData - ITEM_DATA.armor lookup for fallback encumbrance.
 * @param {object} rangedWeaponItemData - ITEM_DATA.rangedWeapons lookup for fallback weight.
 * @param {object} meleeWeaponItemData - ITEM_DATA.meleeWeapons lookup for fallback weight.
 * @returns {number} Total encumbrance (floored integer).
 */
export function calculateTotalEncumbrance(armorItems, rangedWeapons, meleeWeapons, totalGearWeight, armorItemData, rangedWeaponItemData, meleeWeaponItemData) {
  let armorLoad = 0;
  for (const armor of armorItems) {
    let enc = parseFloat(armor.encumbrance);
    if (isNaN(enc)) {
      const dbEntry = (armorItemData && armorItemData[armor.name]) || {};
      enc = parseFloat(dbEntry.encumbrance);
    }
    if (isNaN(enc)) enc = 0;
    armorLoad += enc;
  }
  let weaponWeight = 0;
  for (const w of rangedWeapons) {
    if (w.carried) weaponWeight += (Number(w.weight) || ((rangedWeaponItemData && rangedWeaponItemData[w.name]?.weight) || 0));
  }
  for (const w of meleeWeapons) {
    if (w.carried) weaponWeight += (Number(w.weight) || ((meleeWeaponItemData && meleeWeaponItemData[w.name]?.weight) || 0));
  }
  return Math.floor(armorLoad + totalGearWeight + weaponWeight);
}