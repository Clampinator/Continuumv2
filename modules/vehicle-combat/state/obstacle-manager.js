/*
Obstacle manager - adds/removes environment obstacles (terrain features,
buildings, asteroids, islands, etc.) stored on the scene flag.
Obstacles are domain-specific: land gets buildings/hills,
space gets asteroids, water gets islands/reefs, air gets clouds.
*/

/**
 * Adds an obstacle to the scene's vehicle combat environment.
 * @param {string} sceneId
 * @param {object} obstacleData - { id, type, position, size, metadata }
 */
export async function addObstacle(sceneId, obstacleData) {
  if (!game.user.isGM) return;
  const scene = game.scenes.get(sceneId);
  if (!scene) return;

  const obstacles = scene.getFlag('continuum-v2', 'vehicleCombat.obstacles') ?? [];
  // Prevent duplicate IDs
  if (obstacles.find(o => o.id === obstacleData.id)) return;

  obstacles.push(obstacleData);
  await scene.setFlag('continuum-v2', 'vehicleCombat.obstacles', obstacles);
  Hooks.callAll('vehicle-combat.obstaclesChanged', scene);
}

/**
 * Removes an obstacle by ID.
 * @param {string} sceneId
 * @param {string} obstacleId
 */
export async function removeObstacle(sceneId, obstacleId) {
  if (!game.user.isGM) return;
  const scene = game.scenes.get(sceneId);
  if (!scene) return;

  const obstacles = scene.getFlag('continuum-v2', 'vehicleCombat.obstacles') ?? [];
  const filtered = obstacles.filter(o => o.id !== obstacleId);
  await scene.setFlag('continuum-v2', 'vehicleCombat.obstacles', filtered);
  Hooks.callAll('vehicle-combat.obstaclesChanged', scene);
}

/**
 * Updates a single obstacle's data by ID.
 * @param {string} sceneId
 * @param {string} obstacleId
 * @param {object} updates - Partial updates to merge
 */
export async function updateObstacle(sceneId, obstacleId, updates) {
  if (!game.user.isGM) return;
  const scene = game.scenes.get(sceneId);
  if (!scene) return;

  const obstacles = scene.getFlag('continuum-v2', 'vehicleCombat.obstacles') ?? [];
  const idx = obstacles.findIndex(o => o.id === obstacleId);
  if (idx === -1) return;

  obstacles[idx] = { ...obstacles[idx], ...updates };
  await scene.setFlag('continuum-v2', 'vehicleCombat.obstacles', obstacles);
  Hooks.callAll('vehicle-combat.obstaclesChanged', scene);
}