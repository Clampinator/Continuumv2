/*
Sensor shadow calculation - determines the cumulative sensor
penalty between a sensor position and a target position.
Shadow sources include: debris, chaff, satellite shells, planets.
Pure function.

@param {{ x: number, y: number, z: number }} sensorPosition
@param {{ x: number, y: number, z: number }} targetPosition
@param {object} scene - Scene environment data with obstacles
@returns {{ cumulativePenalty: number, sources: string[], effectiveFunction: number }}
*/
export function calculateSensorShadow(sensorPosition, targetPosition, scene) {
  const obstacles = scene.obstacles ?? [];
  const gravitySources = scene.gravitySources ?? [];
  let penalty = 0;
  const sources = [];

  // Check each obstacle for shadow intersection
  for (const obs of obstacles) {
    const intersection = _lineIntersectsSphere(
      sensorPosition, targetPosition,
      obs.position, obs.size ?? 20
    );

    if (!intersection) continue;

    const shadowPenalty = _shadowPenalty(obs.type, obs.density ?? 1.0);
    if (shadowPenalty > 0) {
      penalty += shadowPenalty;
      sources.push(`${obs.type} (${obs.name ?? obs.id})`);
    }
  }

  // Planets block all detection
  for (const body of gravitySources) {
    const intersection = _lineIntersectsSphere(
      sensorPosition, targetPosition,
      body.position, body.radius ?? 20
    );
    if (intersection) {
      return {
        cumulativePenalty: Infinity,
        sources: [`${body.name ?? 'Celestial body'} (total blockage)`],
        effectiveFunction: 0
      };
    }
  }

  // Effective function reduces by 10% per penalty point
  const effectiveFunction = Math.max(0, 100 - penalty * 10);

  return {
    cumulativePenalty: penalty,
    sources,
    effectiveFunction
  };
}

// Shadow penalty values per obstacle type (mirrors spec table)
function _shadowPenalty(type, density) {
  const PENALTY_TABLE = {
    chaff: 3 * density,
    'debris-low': 1 * density,
    'debris-high': 5 * density,
    satellite: 2 * density,
    asteroid: 3 * density,
    building: 4 * density,
    planet: Infinity,
    moon: Infinity
  };
  return PENALTY_TABLE[type] ?? Math.ceil(density * 2);
}

// Ray-sphere intersection test
function _lineIntersectsSphere(p1, p2, center, radius) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;

  const fx = p1.x - center.x;
  const fy = p1.y - center.y;
  const fz = p1.z - center.z;

  const a = dx * dx + dy * dy + dz * dz;
  const b = 2 * (fx * dx + fy * dy + fz * dz);
  const c = fx * fx + fy * fy + fz * fz - radius * radius;

  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return false;

  discriminant = Math.sqrt(discriminant);
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);

  // Intersection within the line segment (0 <= t <= 1)
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
}