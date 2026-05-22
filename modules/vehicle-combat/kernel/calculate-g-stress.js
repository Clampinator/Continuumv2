/*
Calculate G-stress on crew from acceleration.
Humans can tolerate ~3-6g for short periods.
Sustained high-g causes IP (Injury Point) damage.
Pure function.

@param {number} acceleration - Acceleration in g
@param {Array} crew - Array of crew members with {body, quick}
@returns {Array<{ crewId: string, stress: string, ip: number }>}
*/
export function calculateGStress(acceleration, crew) {
  if (!crew || crew.length === 0) return [];

  return crew.map(member => {
    let stress = 'none';
    let ip = 0;

    if (acceleration <= 1) {
      stress = 'none';
      ip = 0;
    } else if (acceleration <= 3) {
      stress = 'mild';
      ip = 0;
    } else if (acceleration <= 6) {
      stress = 'moderate';
      ip = 1;
    } else if (acceleration <= 9) {
      stress = 'severe';
      ip = 2;
    } else {
      stress = 'extreme';
      ip = 3;
    }

    // Tough crew members reduce IP by 1
    const isTough = member.tough ?? false;
    if (isTough && ip > 0) ip = Math.max(0, ip - 1);

    return {
      crewId: member.id ?? 'unknown',
      stress,
      ip
    };
  });
}