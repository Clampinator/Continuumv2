/*
Updates a vehicle's system block data in scene flags.
System blocks track structureIp and function for each ship subsystem
(bridge, hullFore, hullPort, magazine, sensors, engines, hullAft).
*/

/**
 * Writes updated system block data for a vehicle.
 * @param {string} vehicleId - The vehicle ID
 * @param {string} systemKey - System block key (e.g. 'bridge', 'engines')
 * @param {object} updates - { structureIp, function, heat, etc. }
 */
export async function updateVehicleSystem(vehicleId, systemKey, updates) {
  if (!game.user.isGM) return;
  const scene = canvas.scene;
  if (!scene) return;

  const path = `vehicleCombat.vehicles.${vehicleId}.systems.${systemKey}`;
  await scene.setFlag('continuum-v2', path, updates);
  Hooks.callAll('vehicle-combat.vehicleSystemChanged', scene, vehicleId, systemKey);
}