// Barrel re-export. Import from the specific handler files for new code.
export { handleSettingsClick, handleToggleCheckboxChange, handleSituationClick } from './sheet-handlers-settings.js';
export { handlePersonalLocateClick, handlePersonalGrabClick, handlePersonalTokenClick } from './sheet-handlers-map.js';
export { handleExportLifelineClick, handleImportLifelineClick } from './sheet-handlers-export.js';
export { handleDebugGraphDataClick, handleResetGraphViewClick, handleTimelineSortToggle, handleFixRailOffsetsClick } from './sheet-handlers-debug.js';
export {
    handleSpanGraphHelpClick,
    handlePersonalHelpClick,
    handleAttributesHelpClick,
    handleGoalsHelpClick,
    handleBackgroundHelpClick,
    handleSpanningHelpClick,
    handleMetabilitiesHelpClick,
    handleExperiencesHelpClick,
    handleCombatHelpClick,
    handleTheYetHelpClick,
    handleRelationshipsHelpClick,
    handleLandVehiclesHelpClick,
    handleAirVehiclesHelpClick,
    handleWaterVehiclesHelpClick,
    handleGearHelpClick
} from './sheet-handlers-help.js';
