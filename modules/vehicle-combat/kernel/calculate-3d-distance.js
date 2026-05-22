/*
Calculates the Euclidean 3D distance between two points.
Pure function: no side effects, no DB writes.
@param {{ x: number, y: number, z: number }} posA
@param {{ x: number, y: number, z: number }} posB
@returns {number} Distance in world units
*/
export function calculate3dDistance(posA, posB) {
  const dx = posB.x - posA.x;
  const dy = posB.y - posA.y;
  const dz = posB.z - posA.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}