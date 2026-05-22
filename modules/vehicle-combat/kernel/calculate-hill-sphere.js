/*
Calculates the Hill sphere radius for a body orbiting a primary.
The Hill sphere is the region where a body's gravity dominates
over the primary's tidal forces.
Formula: r = a * (m / (3 * M))^(1/3)
@param {number} bodyMass - Mass of the secondary body (earth-masses)
@param {number} primaryMass - Mass of the primary body (earth-masses)
@param {number} semiMajorAxis - Orbital radius (km)
@returns {number} Hill sphere radius (km)
*/
export function calculateHillSphere(bodyMass, primaryMass, semiMajorAxis) {
  if (primaryMass <= 0) return 0;
  const massRatio = bodyMass / (3 * primaryMass);
  if (massRatio <= 0) return 0;
  return semiMajorAxis * Math.cbrt(massRatio);
}