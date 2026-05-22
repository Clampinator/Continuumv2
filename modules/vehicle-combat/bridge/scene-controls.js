/*
Scene Controls - adds the Vehicle Combat button to Foundry's
scene control toolbar (left sidebar). Uses dynamic import to
avoid loading the 3D renderer at startup.
*/

import { getSceneDomain } from '../state/scene-state-manager.js';

let registered = false;

export function registerSceneControlButton() {
  if (registered) return;
  registered = true;

  Hooks.on('getSceneControlButtons', (controls) => {
    if (!game.user.isGM) return;

    // Use 'gmtools' group if it exists (from NPC generator), otherwise create our own
    if (!controls['gmtools']) {
      controls['gmtools'] = {
        name: 'gmtools',
        order: 80,
        title: 'GM Tools',
        icon: 'fa-solid fa-gem',
        visible: true,
        tools: {}
      };
    }

    const scene = canvas.scene;
    const domain = scene ? getSceneDomain(scene) : 'none';
    const isEnabled = domain !== 'none';

    controls['gmtools'].tools['vc-open'] = {
      name: 'vc-open',
      order: 10,
      title: isEnabled ? `Open Vehicle Combat (${domain})` : 'Vehicle Combat (Not Configured)',
      icon: 'fa-solid fa-rocket',
      visible: true,
      button: true,
      onChange: async () => {
        if (!scene || !isEnabled) {
          ui.notifications.info('Enable Vehicle Combat in Scene Configuration first (right-click scene > Configure).');
          return;
        }
        const { openVehicleCombatScene } = await import('/systems/continuum-v2/modules/vehicle-combat/projector/foundry-app-shell.js');
        openVehicleCombatScene(scene);
      }
    };
  });
}