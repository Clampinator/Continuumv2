/**
 * Resolves item statistics from the game's item catalog by type and name.
 * When a weapon or armor name changes, its stats should be auto-populated
 * from the authoritative ITEM_DATA catalog.
 * @param {string} itemType - 'rangedWeapons', 'meleeWeapons', or 'armor'.
 * @param {string} itemName - The selected item name.
 * @param {object} itemDataCatalog - The full ITEM_DATA object.
 * @returns {object|null} The stat fields to merge, or null if not found.
 */
export function resolveItemStats(itemType, itemName, itemDataCatalog) {
  if (!itemType || !itemName) return null;
  const collection = itemDataCatalog[itemType];
  if (!collection) return null;
  return collection[itemName] || null;
}