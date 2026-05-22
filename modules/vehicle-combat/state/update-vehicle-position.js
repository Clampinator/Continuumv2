/*
Updates a vehicle's 3D position and velocity in scene flags.
Called by the Kernel after validating a navigation action or
by the GM when manually adjusting a vehicle on the 3D scene.
Position and velocity are { x, y, z } in world units (km for space, m for land/air/water).
*/

/**
 * Writes a vehicle's new position and velocity to scene flags.
 * @param {string} vehicleId - The vehicle's actor or item ID
 * @param {{ x: number, y: number, z: number }} position - World position
 * @param {{ x: number, y: number, z: number }} velocity - World velocity (units/s)
 */
export async function importUpdateVehiclePosition(vehicleId, position, velocity) {
  if (!game.user.isGM) return;
  const scene = canvas.scene;
  if (!scene) return;

  const path = `vehicleCombat.vehicles.${vehicleId}`;
  const current = scene.getFlag('continuum-v2', path) ?? {};

  await scene.setFlag('continuum-v2', path, {
    ...current,
    position: { x: position.x, y: position.y, z: position.z },
    velocity: { x: velocity.x, y: velocity.y, z: velocity.z }
  });

  Hooks.callAll('vehicle-combat.vehicleMoved', scene, vehicleId);
}