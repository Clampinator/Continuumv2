/*
Calculates a drift trajectory for an unpowered vehicle.
Uses simple Euler integration of gravity over a time horizon.
Returns an array of { position, velocity } points.
Pure function.

@param {object} vehicle - { position: {x,y,z}, velocity: {x,y,z} }
@param {Array} gravitySources - Scene gravity sources
@param {number} timeHorizon - How far ahead to project (seconds)
@param {number} [stepSize=10] - Integration step size (seconds)
@returns {Array<{ time: number, position: object, velocity: object }>}
*/
export function calculateDriftTrajectory(vehicle, gravitySources, timeHorizon, stepSize = 10) {
  const points = [];
  let pos = { ...vehicle.position };
  let vel = { ...vehicle.velocity };
  const steps = Math.ceil(timeHorizon / stepSize);

  for (let i = 0; i <= steps; i++) {
    points.push({
      time: i * stepSize,
      position: { ...pos },
      velocity: { ...vel }
    });

    // Compute gravity at current position
    const gravity = _gravityAt(pos, gravitySources);

    // Euler integration: v += a*dt, p += v*dt
    vel.x += gravity.x * stepSize;
    vel.y += gravity.y * stepSize;
    vel.z += gravity.z * stepSize;

    pos.x += vel.x * stepSize;
    pos.y += vel.y * stepSize;
    pos.z += vel.z * stepSize;
  }

  return points;
}

// Inline gravity computation to avoid circular imports
function _gravityAt(position, gravitySources) {
  if (!gravitySources || gravitySources.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  let gx = 0, gy = 0, gz = 0;
  for (const source of gravitySources) {
    const dx = source.position.x - position.x;
    const dy = source.position.y - position.y;
    const dz = source.position.z - position.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const dist = Math.sqrt(distSq);
    const safeDist = Math.max(dist, 1);
    const force = source.mass / (safeDist * safeDist);

    if (dist > 0) {
      gx += (dx / dist) * force;
      gy += (dy / dist) * force;
      gz += (dz / dist) * force;
    }
  }

  return { x: gx, y: gy, z: gz };
}