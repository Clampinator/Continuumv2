import { updateMetabilityInfo } from './roll-dialog/update-metability-info.js';
import { setSlider } from './roll-dialog/set-slider.js';
import { generateInfoBoxes } from './roll-dialog/generate-info-boxes.js';
import { generateVehicleInfoBoxes } from './roll-dialog/generate-vehicle-info-boxes.js';

/**
 * Orchestrator for Roll Dialog UI state.
 */
export const RollDialogController = {
    updateMetabilityInfo,
    setSlider,
    generateInfoBoxes,
    generateVehicleInfoBoxes
};
