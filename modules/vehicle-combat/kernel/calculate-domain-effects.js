/*
Domain effects calculator - computes terrain, atmosphere, and water
effects based on the vehicle combat environment domain.
Pure function: no side effects, no DB writes.

LAND: speed caps, fuel modifiers, rollover risk based on terrain/grade
AIR: drag, stall speed, structural limit, cooling based on altitude
WATER: drag, pressure, buoyancy, cooling based on depth
SPACE: no domain effects (gravity handled separately)
*/

/**
 * Calculates land terrain effects on a vehicle.
 * @param {object} vehicle - Vehicle data with mass, speed
 * @param {string} terrainType - 'flat'|'hills'|'mountains'|'urban'|'desert'|'ice'
 * @param {number} grade - Slope in degrees (0 = flat, positive = uphill)
 * @returns {{ speedCap: number, fuelModifier: number, rolloverRisk: number }}
 */
export function calculateTerrainEffects(vehicle, terrainType, grade) {
  const TERRAIN_SPEED_CAPS = {
    flat: Infinity,
    hills: 0.7,
    mountains: 0.4,
    urban: 0.5,
    desert: 0.8,
    ice: 0.6
  };

  const TERRAIN_FUEL_MODS = {
    flat: 1.0,
    hills: 1.3,
    mountains: 1.8,
    urban: 1.1,
    desert: 1.2,
    ice: 1.1
  };

  const speedCap = TERRAIN_SPEED_CAPS[terrainType] ?? Infinity;
  const fuelModifier = TERRAIN_FUEL_MODS[terrainType] ?? 1.0;

  // Grade effects: uphill costs more fuel, increases rollover risk
  const gradeRad = (grade * Math.PI) / 180;
  const gradeFuelMod = grade > 0 ? 1 + Math.sin(gradeRad) * 2 : 1 - Math.abs(Math.sin(gradeRad)) * 0.3;

  // Rollover risk: higher for tall/narrow vehicles on slopes
  const baseRollover = terrainType === 'ice' ? 0.3 : terrainType === 'hills' ? 0.1 : 0;
  const rolloverRisk = Math.min(1, baseRollover + Math.max(0, Math.sin(gradeRad)));

  return {
    speedCap: speedCap * (1 - Math.max(0, grade) * 0.02),
    fuelModifier: fuelModifier * gradeFuelMod,
    rolloverRisk
  };
}

/**
 * Calculates atmosphere effects on a vehicle in the air domain.
 * @param {object} vehicle - Vehicle data
 * @param {number} altitude - Altitude in km
 * @returns {{ drag: number, stallSpeed: number, structuralLimit: number, coolingModifier: number }}
 */
export function calculateAtmosphereEffects(vehicle, altitude) {
  // Atmospheric density drops exponentially. Sea level = 1.0
  const atmDensity = Math.exp(-altitude / 8.5);

  // Drag proportional to density
  const drag = atmDensity;

  // Stall speed increases as air thins
  const stallSpeed = 50 / Math.max(0.01, Math.sqrt(atmDensity));

  // Structural limit: speed of sound drops with temperature at altitude
  const structuralLimit = 1200 * Math.sqrt(Math.max(0.5, 1 - altitude / 50));

  // Cooling: thinner air = less cooling
  const coolingModifier = atmDensity;

  return { drag, stallSpeed, structuralLimit, coolingModifier };
}

/**
 * Calculates water effects on a vehicle in the water domain.
 * @param {object} vehicle - Vehicle data
 * @param {number} depth - Depth in meters (0 = surface, negative = deeper)
 * @returns {{ drag: number, pressure: number, buoyancy: number, coolingModifier: number }}
 */
export function calculateWaterEffects(vehicle, depth) {
  const absDepth = Math.abs(depth);

  // Water drag is constant (~800x air density)
  const drag = depth <= 0 ? 0.8 : 1.0;

  // Pressure increases 1 atm per ~10m depth
  const pressure = 1 + absDepth / 10;

  // Buoyancy at surface, decreasing with depth for submarines
  const buoyancy = depth <= 0 ? 1.0 : Math.max(0, 1 - depth / 1000);

  // Water is excellent for cooling
  const coolingModifier = 3.0;

  return { drag, pressure, buoyancy, coolingModifier };
}