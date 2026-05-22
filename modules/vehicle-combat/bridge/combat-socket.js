/*
Vehicle combat socket - handles real-time state sync between clients.
Only the active GM processes write operations; results are broadcast
via Foundry's socket system. Mirrors the combat-socket pattern from
the core system.
*/

const SOCKET_NAME = 'system.continuum';

let _initialized = false;

export function initVehicleCombatSocket() {
  if (_initialized) return;
  _initialized = true;

  game.socket.on(SOCKET_NAME, (data) => {
    if (data.module !== 'vehicle-combat') return;

    // Only active GM processes mutations
    if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;

    switch (data.type) {
      case 'updateVehiclePosition':
        _handleUpdateVehiclePosition(data);
        break;
      case 'updateEnvironment':
        _handleUpdateEnvironment(data);
        break;
      case 'addObstacle':
        _handleAddObstacle(data);
        break;
      case 'removeObstacle':
        _handleRemoveObstacle(data);
        break;
    }
  });
}

// Emit a vehicle position update request
export function emitVehiclePosition(vehicleId, position, velocity) {
  game.socket.emit(SOCKET_NAME, {
    module: 'vehicle-combat',
    type: 'updateVehiclePosition',
    sceneId: canvas.scene?.id,
    vehicleId,
    position,
    velocity
  });
}

// Emit an environment data update
export function emitEnvironmentUpdate(sceneId, updates) {
  game.socket.emit(SOCKET_NAME, {
    module: 'vehicle-combat',
    type: 'updateEnvironment',
    sceneId,
    updates
  });
}

// Emit an obstacle addition
export function emitAddObstacle(sceneId, obstacleData) {
  game.socket.emit(SOCKET_NAME, {
    module: 'vehicle-combat',
    type: 'addObstacle',
    sceneId,
    obstacleData
  });
}

// Emit an obstacle removal
export function emitRemoveObstacle(sceneId, obstacleId) {
  game.socket.emit(SOCKET_NAME, {
    module: 'vehicle-combat',
    type: 'removeObstacle',
    sceneId,
    obstacleId
  });
}

// GM-side handlers write to scene flags
async function _handleUpdateVehiclePosition(data) {
  const { importUpdateVehiclePosition } = await import('/systems/continuum-v2/modules/vehicle-combat/state/update-vehicle-position.js');
  await importUpdateVehiclePosition(data.vehicleId, data.position, data.velocity);
}

async function _handleUpdateEnvironment(data) {
  const { updateEnvironmentData } = await import('/systems/continuum-v2/modules/vehicle-combat/state/scene-state-manager.js');
  await updateEnvironmentData(data.sceneId, data.updates);
}

async function _handleAddObstacle(data) {
  const { addObstacle } = await import('/systems/continuum-v2/modules/vehicle-combat/state/obstacle-manager.js');
  await addObstacle(data.sceneId, data.obstacleData);
}

async function _handleRemoveObstacle(data) {
  const { removeObstacle } = await import('/systems/continuum-v2/modules/vehicle-combat/state/obstacle-manager.js');
  await removeObstacle(data.sceneId, data.obstacleId);
}