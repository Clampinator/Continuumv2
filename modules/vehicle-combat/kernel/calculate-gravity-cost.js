/*
Calculates the delta-v cost from gravity when traveling between two points.
In the simplified model, gravity assist or cost depends on whether
the trajectory goes with or against the gravity gradient.
Pure function.

@param {{ x: number, y: number, z: number }} positionA - Start position
@param {{ x: number, y: number, z: number }} positionB - End position
@param {Array} gravitySources - Gravity sources in the scene
@returns {number} Gravity delta-v cost (positive = expenditure needed)
*/
export function calculateGravityCost(positionA, positionB, gravitySources) {
  if (!gravitySources || gravitySources.length === 0) return 0;

  let totalCost = 0;

  for (const source of gravitySources) {
    const distA = Math.sqrt(
      Math.pow(source.position.x - positionA.x, 2) +
      Math.pow(source.position.y - positionA.y, 2) +
      Math.pow(source.position.z - positionA.z, 2)
    );
    const distB = Math.sqrt(
      Math.pow(source.position.x - positionB.x, 2) +
      Math.pow(source.position.y - positionB.y, 2) +
      Math.pow(source.position.z - positionB.z, 2)
    );

    // Going deeper in the gravity well costs delta-v
    // Going uphill (away from body) costs; downhill (toward) can assist
    const safeDistA = Math.max(distA, 1);
    const safeDistB = Math.max(distB, 1);

    // Potential energy difference: going further = cost, closer = assist
    // Approximate: cost proportional to mass * |1/rA - 1/rB|
    const potentialDiff = source.mass * (1 / safeDistA - 1 / safeDistB);

    // If moving away from body (rB > rA), potential increases -> cost
    // If moving toward body (rB < rA), potential decreases -> assist
    if (distB > distA) {
      totalCost += Math.abs(potentialDiff) * 11.2;
    } else {
      // Gravity assist: reduce cost but don't go negative
      totalCost = Math.max(0, totalCost - Math.abs(potentialDiff) * 5.6);
    }
  }

  return totalCost;
}