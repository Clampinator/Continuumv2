/*
Calculate heat generation from vehicle operations.
Thrust, weapons, and active systems all generate heat.
Pure function.

@param {number} thrust - Current thrust level (0-1 fraction of max)
@param {number} weaponsFired - Number of weapons fired this phase
@param {Array} activeSystems - List of active system names
@returns {number} Heat generated this phase
*/
export function calculateHeatGeneration(thrust, weaponsFired, activeSystems) {
  let heat = 0;

  // Thrust generates heat proportional to power output
  heat += thrust * 15;

  // Each weapon fired adds heat
  heat += weaponsFired * 5;

  // Active systems add baseline heat
  const SYSTEM_HEAT = {
    sensors: 2,
    bridge: 1,
    engines: 3,
    magazine: 1
  };

  if (activeSystems) {
    for (const sys of activeSystems) {
      heat += SYSTEM_HEAT[sys] ?? 1;
    }
  }

  if (activeSystems?.includes('sensors') && thrust > 0.5) {
    heat += 2;
  }

  return Math.round(heat * 10) / 10;
}