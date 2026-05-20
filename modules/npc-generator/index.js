import { NPCWizardApp } from './npc-wizard-app.js';

let wizardInstance = null;

export function openNPCGeneratorWizard() {
  if (wizardInstance) {
    wizardInstance.render(true);
    return;
  }
  wizardInstance = new NPCWizardApp();
  wizardInstance.render(true);
}

export function closeNPCGeneratorWizard() {
  if (wizardInstance) {
    wizardInstance.close();
    wizardInstance = null;
  }
}
