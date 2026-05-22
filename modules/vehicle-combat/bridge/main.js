/*
Vehicle Combat Module - entry point.
Hooks into Foundry init/ready to register scene config,
socket listener, and vehicle combat API surface.
Architecture: Trinity (State / Kernel / Projector).

Uses lazy imports for the 3D renderer to avoid loading
heavy WebGL code at startup.
*/

import { registerSceneConfig } from './scene-config-hook.js';
import { initVehicleCombatSocket } from './combat-socket.js';
import { getSceneEnvironment } from '../state/scene-state-manager.js';

Hooks.once('init', () => {
  registerSceneConfig();
});

Hooks.once('ready', () => {
  initVehicleCombatSocket();

  // Lazy import - only loads the scene controls when Foundry is ready
  import('./scene-controls.js').then(({ registerSceneControlButton }) => {
    registerSceneControlButton();
  });

  // Expose module API so other modules/macros can open the 3D scene
  game.system.vehicleCombat = {
    openScene: async (scene) => {
      const { openVehicleCombatScene } = await import('/systems/continuum-v2/modules/vehicle-combat/projector/foundry-app-shell.js');
      return openVehicleCombatScene(scene);
    },
    getEnvironment: (scene) => getSceneEnvironment(scene)
  };
  Hooks.callAll('vehicle-combat.ready');
});