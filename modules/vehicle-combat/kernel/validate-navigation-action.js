/*
Navigate action validator - checks whether a vehicle can perform
a navigation action given its current resources and constraints.
Pure function.

@param {object} vehicle - Vehicle data with propellant, heat, systems
@param {object} solution - Navigation solution from calculateBrachistochrone
@returns {{ valid: boolean, reasons: string[] }}
*/
export function validateNavigationAction(vehicle, solution) {
  const reasons = [];

  // Check propellant
  const currentPropellant = vehicle.propellant ?? 0;
  if (solution.deltaV > 0 && currentPropellant <= 0) {
    reasons.push('No propellant remaining');
  }

  // Check engine function
  const engineFunction = vehicle.systems?.engines?.function ?? 10;
  if (engineFunction <= 0) {
    reasons.push('Engines destroyed');
  }

  // Check heat capacity
  const heat = vehicle.heat ?? 0;
  const maxHeat = vehicle.maxHeat ?? 100;
  if (heat >= maxHeat * 0.9) {
    reasons.push('Heat near critical - navigation risk');
  }

  // Check G-stress limits
  if (solution.acceleration > 6) {
    reasons.push('Acceleration exceeds crew G-limit (6g)');
  }

  return {
    valid: reasons.length === 0,
    reasons
  };
}