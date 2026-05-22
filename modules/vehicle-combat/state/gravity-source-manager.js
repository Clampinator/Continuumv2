/*
Manages gravity sources on space scenes.
Gravity sources are celestial bodies (planets, moons) with mass,
position, and optional Hill sphere info. Used by the kernel
to compute drift trajectories, gravity delta-v, and Lagrange points.
*/

/**
 * Adds a gravity source to the scene.
 * @param {string} sceneId
 * @param {object} sourceData - { id, name, position: {x,y,z}, mass, radius, color }
 */
export async function addGravitySource(sceneId, sourceData) {
  if (!game.user.isGM) return;
  const scene = game.scenes.get(sceneId);
  if (!scene) return;

  const sources = scene.getFlag('continuum-v2', 'vehicleCombat.gravitySources') ?? [];
  if (sources.find(s => s.id === sourceData.id)) return;

  sources.push(sourceData);
  await scene.setFlag('continuum-v2', 'vehicleCombat.gravitySources', sources);
  Hooks.callAll('vehicle-combat.gravitySourcesChanged', scene);
}

/**
 * Removes a gravity source by ID.
 * @param {string} sceneId
 * @param {string} sourceId
 */
export async function removeGravitySource(sceneId, sourceId) {
  if (!game.user.isGM) return;
  const scene = game.scenes.get(sceneId);
  if (!scene) return;

  const sources = scene.getFlag('continuum-v2', 'vehicleCombat.gravitySources') ?? [];
  const filtered = sources.filter(s => s.id !== sourceId);
  await scene.setFlag('continuum-v2', 'vehicleCombat.gravitySources', filtered);
  Hooks.callAll('vehicle-combat.gravitySourcesChanged', scene);
}

/**
 * Updates a gravity source's data.
 * @param {string} sceneId
 * @param {string} sourceId
 * @param {object} updates
 */
export async function updateGravitySource(sceneId, sourceId, updates) {
  if (!game.user.isGM) return;
  const scene = game.scenes.get(sceneId);
  if (!scene) return;

  const sources = scene.getFlag('continuum-v2', 'vehicleCombat.gravitySources') ?? [];
  const idx = sources.findIndex(s => s.id === sourceId);
  if (idx === -1) return;

  sources[idx] = { ...sources[idx], ...updates };
  await scene.setFlag('continuum-v2', 'vehicleCombat.gravitySources', sources);
  Hooks.callAll('vehicle-combat.gravitySourcesChanged', scene);
}