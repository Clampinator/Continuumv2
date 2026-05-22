/*
Scene State Manager - reads/writes vehicle combat scene flags.
The scene flag holds: domain, gravity, atmosphereDensity,
vehicles[], obstacles[], gravitySources[].
This is the STATE layer: all reads return deep clones, all writes
go through Foundry's flag API and emit socket events.
*/

import { emitEnvironmentUpdate } from '../bridge/combat-socket.js';

// Default scene environment state
const DEFAULT_ENVIRONMENT = {
  domain: 'none',
  gravity: 1.0,
  atmosphereDensity: 1.0,
  vehicles: {},
  obstacles: [],
  gravitySources: []
};

/**
 * Reads the full vehicle combat environment for a scene.
 * @param {Scene} scene - The Foundry Scene document
 * @returns {object} Deep clone of the environment state
 */
export function getSceneEnvironment(scene) {
  const flagData = scene.getFlag('continuum-v2', 'vehicleCombat');
  if (!flagData) return foundry.utils.deepClone(DEFAULT_ENVIRONMENT);
  return foundry.utils.deepClone({ ...DEFAULT_ENVIRONMENT, ...flagData });
}

/**
 * Returns just the domain type for a scene ('none'|'land'|'air'|'water'|'space').
 * @param {Scene} scene
 * @returns {string}
 */
export function getSceneDomain(scene) {
  return scene.getFlag('continuum-v2', 'vehicleCombat.domain') ?? 'none';
}

/**
 * Returns all vehicles registered in this scene's vehicle combat.
 * @param {Scene} scene
 * @returns {object} Map of vehicleId -> vehicleData
 */
export function getSceneVehicles(scene) {
  const env = getSceneEnvironment(scene);
  return env.vehicles;
}

/**
 * Returns all obstacles in this scene's environment.
 * @param {Scene} scene
 * @returns {Array}
 */
export function getSceneObstacles(scene) {
  const env = getSceneEnvironment(scene);
  return env.obstacles;
}

/**
 * Returns gravity sources (planets, moons) for space scenes.
 * @param {Scene} scene
 * @returns {Array}
 */
export function getGravitySources(scene) {
  const env = getSceneEnvironment(scene);
  return env.gravitySources;
}

/**
 * Writes partial updates to the scene's vehicle combat flags.
 * Only GMs may write. Emits socket event for client sync.
 * @param {string} sceneId - The scene ID
 * @param {object} updates - Partial updates to merge into the flag
 */
export async function updateEnvironmentData(sceneId, updates) {
  if (!game.user.isGM) return;
  const scene = game.scenes.get(sceneId);
  if (!scene) return;

  // Foundry setFlag merges at the top level, so we write the full nested path
  for (const [key, value] of Object.entries(updates)) {
    await scene.setFlag('continuum-v2', `vehicleCombat.${key}`, value);
  }

  emitEnvironmentUpdate(sceneId, updates);
  Hooks.callAll('vehicle-combat.environmentChanged', scene);
}

/**
 * Initializes a scene's vehicle combat flags for a given domain.
 * Called when GM first enables vehicle combat on a scene.
 * @param {Scene} scene
 * @param {string} domain - 'land'|'air'|'water'|'space'
 * @param {object} [options] - Optional overrides for gravity, atmosphereDensity
 */
export async function initializeSceneEnvironment(scene, domain, options = {}) {
  if (!game.user.isGM) return;

  const defaults = _domainDefaults(domain);
  const envData = {
    domain,
    gravity: options.gravity ?? defaults.gravity,
    atmosphereDensity: options.atmosphereDensity ?? defaults.atmosphereDensity,
    vehicles: {},
    obstacles: [],
    gravitySources: defaults.gravitySources
  };

  await scene.setFlag('continuum-v2', 'vehicleCombat', envData);
  Hooks.callAll('vehicle-combat.environmentChanged', scene);
}

// Domain-specific defaults for physics parameters
function _domainDefaults(domain) {
  switch (domain) {
    case 'land':
      return { gravity: 1.0, atmosphereDensity: 1.0, gravitySources: [] };
    case 'air':
      return { gravity: 1.0, atmosphereDensity: 1.0, gravitySources: [] };
    case 'water':
      return { gravity: 1.0, atmosphereDensity: 1.0, gravitySources: [] };
    case 'space':
      return { gravity: 0.0, atmosphereDensity: 0.0, gravitySources: [] };
    default:
      return { gravity: 1.0, atmosphereDensity: 1.0, gravitySources: [] };
  }
}