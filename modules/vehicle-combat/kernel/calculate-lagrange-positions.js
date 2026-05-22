/*
Calculates Lagrange point positions for a two-body system.
L1-L5 positions relative to the primary body.
For game purposes, we approximate circular restricted three-body problem.
@param {object} primary - { position, mass }
@param {object} secondary - { position, mass }
@returns {Array<{ id: string, position: { x, y, z }, type: string }>}
*/
export function calculateLagrangePositions(primary, secondary) {
  if (!primary || !secondary) return [];

  const dx = secondary.position.x - primary.position.x;
  const dy = secondary.position.y - primary.position.y;
  const dz = secondary.position.z - primary.position.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (dist === 0) return [];

  // Unit vector from primary to secondary
  const ux = dx / dist;
  const uy = dy / dist;
  const uz = dz / dist;

  // Perpendicular vector (arbitrary but consistent in 2D plane)
  const px = -uy;
  const py = ux;
  const pz = 0;

  const totalMass = primary.mass + secondary.mass;
  const massRatio = secondary.mass / totalMass;

  // Approximate positions (simplified for game use)
  const L1r = dist * (1 - Math.cbrt(massRatio / 3));
  const L2r = dist * (1 + Math.cbrt(massRatio / 3));
  const L3r = -dist * (1 + (5 * massRatio) / 12);
  const L4L5r = dist;

  return [
    {
      id: 'L1',
      position: {
        x: primary.position.x + ux * L1r,
        y: primary.position.y + uy * L1r,
        z: primary.position.z + uz * L1r
      },
      type: 'unstable'
    },
    {
      id: 'L2',
      position: {
        x: primary.position.x + ux * L2r,
        y: primary.position.y + uy * L2r,
        z: primary.position.z + uz * L2r
      },
      type: 'unstable'
    },
    {
      id: 'L3',
      position: {
        x: primary.position.x + ux * L3r,
        y: primary.position.y + uy * L3r,
        z: primary.position.z + uz * L3r
      },
      type: 'unstable'
    },
    {
      id: 'L4',
      position: {
        x: primary.position.x + ux * L4L5r * 0.5 + px * L4L5r * 0.866,
        y: primary.position.y + uy * L4L5r * 0.5 + py * L4L5r * 0.866,
        z: primary.position.z
      },
      type: 'stable'
    },
    {
      id: 'L5',
      position: {
        x: primary.position.x + ux * L4L5r * 0.5 - px * L4L5r * 0.866,
        y: primary.position.y + uy * L4L5r * 0.5 - py * L4L5r * 0.866,
        z: primary.position.z
      },
      type: 'stable'
    }
  ];
}