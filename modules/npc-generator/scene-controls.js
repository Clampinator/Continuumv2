import { openNPCGeneratorWizard } from './index.js';

let registered = false;

export function registerSceneControl() {
  if (registered) return;
  registered = true;

  Hooks.on('getSceneControlButtons', (controls) => {
    controls['gmtools'] = {
      name: 'gmtools',
      order: 99,
      eventTitle: 'GM Tools',
      icon: 'fa-solid fa-gem',
      visible: game.user.isGM,
      tools: {
        'npc-generator': {
          name: 'npc-generator',
          order: 1,
          eventTitle: 'NPC Generator',
          icon: 'fa-solid fa-user-plus',
          visible: game.user.isGM,
          button: true,
          onChange: () => openNPCGeneratorWizard()
        }
      },
      activeTool: 'npc-generator'
    };
  });
}
