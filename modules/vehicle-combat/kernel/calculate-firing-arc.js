/*
Firing arc check - determines if a target is within a weapon's
declared firing arc. Arcs are defined as cone angles relative
to the vehicle's forward axis.
Pure function.

@param {object} vehicle - Vehicle with position and facing
@param {object} target - Target position
@param {string} weaponArc - 'forward'|'broadside'|'aft'|'all'|'turret'
@returns {boolean}
*/
export function calculateFiringArc(vehicle, target, weaponArc) {
  if (weaponArc === 'all' || weaponArc === 'turret') return true;

  const pos = vehicle.position;
  const facing = vehicle.facing ?? { x: 1, y: 0, z: 0 };

  // Direction to target
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dz = target.z - pos.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist === 0) return true;

  // Dot product: cosine of angle between facing and target direction
  const dot = (facing.x * dx + facing.y * dy + facing.z * dz) / dist;
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

  const HALF_PI = Math.PI / 2;

  switch (weaponArc) {
    case 'forward':
      // 90-degree forward cone
      return angle < HALF_PI;
    case 'broadside':
      // Side arcs: 45-135 degrees from forward
      return angle >= HALF_PI * 0.5 && angle < HALF_PI * 1.5;
    case 'aft':
      // 90-degree rear cone
      return angle >= HALF_PI;
    default:
      return true;
  }
}