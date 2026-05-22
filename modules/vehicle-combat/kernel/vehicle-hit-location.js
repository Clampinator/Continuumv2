/*
Vehicle hit location table - maps d10 roll to vehicle system block.
Mirrors the personal combat hit location system structure.
*/

export const VEHICLE_HIT_LOCATION = {
  1:  { code: 'A', system: 'bridge',    name: 'Bridge' },
  2:  { code: 'B', system: 'hullFore',   name: 'Forward Hull' },
  3:  { code: 'B', system: 'hullFore',   name: 'Forward Hull' },
  4:  { code: 'C', system: 'hullPort',   name: 'Port Hull' },
  5:  { code: 'D', system: 'magazine',   name: 'Magazine' },
  6:  { code: 'D', system: 'magazine',   name: 'Magazine' },
  7:  { code: 'F', system: 'sensors',    name: 'Sensors' },
  8:  { code: 'E', system: 'engines',    name: 'Engines' },
  9:  { code: 'E', system: 'engines',    name: 'Engines' },
  10: { code: 'G', system: 'hullAft',   name: 'Aft Hull' }
};

/**
 * Resolves a d10 roll to a vehicle system hit location.
 * @param {number} roll - d10 result (1-10)
 * @returns {{ code: string, system: string, name: string }}
 */
export function resolveVehicleHitLocation(roll) {
  const clamped = Math.max(1, Math.min(10, Math.floor(roll)));
  return VEHICLE_HIT_LOCATION[clamped];
}