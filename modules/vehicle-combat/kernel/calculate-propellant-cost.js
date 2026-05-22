/*
Propellant cost calculator - converts delta-v to propellant units
using the rocket equation: deltaV = Isp * g0 * ln(m0/m1).
Rearranged: propellant = m0 * (1 - e^(-deltaV / (Isp * g0)))
Pure function.

@param {number} deltaV - Required change in velocity (km/s)
@param {number} mass - Vehicle dry mass (tons)
@param {number} isp - Specific impulse (seconds)
@returns {number} Propellant units consumed
*/
export function calculatePropellantCost(deltaV, mass, isp) {
  if (deltaV <= 0 || mass <= 0 || isp <= 0) return 0;

  const g0 = 9.81 / 1000;
  const exhaustVel = isp * g0;
  const massRatio = Math.exp(deltaV / exhaustVel);
  const wetMass = mass * massRatio;
  const propellantCost = wetMass - mass;

  return propellantCost;
}