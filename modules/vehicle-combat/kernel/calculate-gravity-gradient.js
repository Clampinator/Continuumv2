/*
Calculates the net gravity vector and magnitude at a given position
from all gravity sources in the scene.
Pure function, stateless.
Uses Newtonian gravity: F = G * M / r^2, direction toward source.
G is normalized to 1 for game-scale (distances in km, masses in earth-masses).
@param {{ x: number, y: number, z: number }} position
@param {Array<{ id: string, position: object, mass: number }>} gravitySources
@returns {{ vector: { x: number, y: number, z: number }, magnitude: number, dominantBody: string|null }}
*/
export function calculateGravityGradient(position, gravitySources) {
  if (!gravitySources || gravitySources.length === 0) {
    return { vector: { x: 0, y: 0, z: 0 }, magnitude: 0, dominantBody: null };
  }

  let totalX = 0;
  let totalY = 0;
  let totalZ = 0;
  let maxForce = 0;
  let dominantBody = null;

  for (const source of gravitySources) {
    const dx = source.position.x - position.x;
    const dy = source.position.y - position.y;
    const dz = source.position.z - position.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const dist = Math.sqrt(distSq);

    // Avoid division by zero - minimum 1 km distance
    const safeDist = Math.max(dist, 1);
    const force = source.mass / (safeDist * safeDist);

    if (dist > 0) {
      totalX += (dx / dist) * force;
      totalY += (dy / dist) * force;
      totalZ += (dz / dist) * force;
    }

    if (force > maxForce) {
      maxForce = force;
      dominantBody = source.id;
    }
  }

  const magnitude = Math.sqrt(totalX * totalX + totalY * totalY + totalZ * totalZ);

  return {
    vector: { x: totalX, y: totalY, z: totalZ },
    magnitude,
    dominantBody
  };
}