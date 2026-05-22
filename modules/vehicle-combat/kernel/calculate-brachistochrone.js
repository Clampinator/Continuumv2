/*
Calculates a brachistochrone trajectory - the minimum-time path
between two points with constant acceleration then deceleration.
Half the time is acceleration, half is deceleration.
Pure function.

@param {number} distance - Distance in world units (km)
@param {number} time - Available time in seconds
@param {boolean} fullStop - True = decelerate to rest, False = flyby (waypoint)
@returns {{ acceleration: number, deltaV: number, burnPhases: Array }}
*/
export function calculateBrachistochrone(distance, time, fullStop) {
  if (distance <= 0 || time <= 0) {
    return { acceleration: 0, deltaV: 0, burnPhases: [] };
  }

  if (fullStop) {
    // Constant accel halfway, constant decel halfway
    // d = 0.5 * a * t^2 for each half => total d = 0.25 * a * t^2
    const halfTime = time / 2;
    const accel = (4 * distance) / (time * time);
    const deltaV = accel * halfTime;

    return {
      acceleration: accel,
      deltaV: deltaV * 2,
      burnPhases: [
        { phase: 'burn', duration: halfTime, acceleration: accel },
        { phase: 'coast', duration: 0, acceleration: 0 },
        { phase: 'decel', duration: halfTime, acceleration: -accel }
      ]
    };
  }

  // Waypoint: accelerate entire time, pass through at speed
  const accel = (2 * distance) / (time * time);
  const deltaV = accel * time;

  return {
    acceleration: accel,
    deltaV,
    burnPhases: [
      { phase: 'burn', duration: time, acceleration: accel },
      { phase: 'coast', duration: 0, acceleration: 0 },
      { phase: 'decel', duration: 0, acceleration: 0 }
    ]
  };
}