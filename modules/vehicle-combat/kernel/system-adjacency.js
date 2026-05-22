/*
System adjacency map for cascade damage resolution.
When a system is destroyed, adjacent systems take cascade damage.
Mirrors the adjacency pattern from the spec.
*/

export const SYSTEM_ADJACENCY = {
  bridge:    ['sensors', 'hullFore'],
  hullFore:  ['bridge', 'hullPort', 'magazine', 'sensors'],
  hullPort:  ['hullFore', 'magazine', 'hullAft'],
  magazine:  ['hullFore', 'hullPort', 'engines'],
  sensors:   ['bridge', 'hullFore', 'engines'],
  engines:   ['magazine', 'sensors', 'hullAft'],
  hullAft:   ['hullPort', 'engines']
};

/**
 * Gets the list of adjacent systems for cascade damage.
 * @param {string} systemKey - The destroyed system
 * @returns {string[]} Adjacent system keys
 */
export function getAdjacentSystems(systemKey) {
  return SYSTEM_ADJACENCY[systemKey] ?? [];
}