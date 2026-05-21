/**
 * Resolves vehicle statistics from the game's item catalog by name.
 * Searches all vehicle collections (land, air, water) since the dropdown
 * shows all types regardless of the row's systemKey.
 * @param {string} vehicleName - The selected vehicle name.
 * @param {object} itemDataCatalog - The full ITEM_DATA object with vehicles, airVehicles, waterVehicles.
 * @returns {object|null} The stat fields to merge, or null if not found.
 */
export function resolveVehicleStats(vehicleName, itemDataCatalog) {
  if (!vehicleName) return null;
  return itemDataCatalog.vehicles?.[vehicleName]
    ?? itemDataCatalog.airVehicles?.[vehicleName]
    ?? itemDataCatalog.waterVehicles?.[vehicleName]
    ?? null;
}