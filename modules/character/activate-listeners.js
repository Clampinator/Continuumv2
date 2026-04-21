
import { initializeDragAndDrop } from '../../continuum-drag-drop.js';
// import { initializeSpanGraph } from '../span-graph-container.js';
import { initializeCharRelationshipGraph } from '../relationships/index.js';
import { initializeSearch } from '../../sheet-search.js';
import { initializeDiceRoller } from '../../sheet-dice-roller.js';
import { initializeSpinners } from '../sheet-spinners.js';
import { activateDatePickers } from '../date-picker.js';
import { ExperienceTooltipService } from '../lifeline/services/ui/experience-tooltip-service.js';
import { handleRestToggle } from '../lifeline/services/ui/handle-rest-toggle.js';
import { handleAppIngredientChange, updateVolumeDisplay } from './handle-app-ingredient-change.js';
import { handleAppApply } from './handle-app-apply.js';
import { initializeAppSpinners } from './initialize-app-spinners.js';
import { handleGearUse } from './handle-gear-use.js';
import { 
    handlePersonalHelpClick, handleAttributesHelpClick, handleGoalsHelpClick,
    handleBackgroundHelpClick, handleSpanningHelpClick, handleMetabilitiesHelpClick, handleExperiencesHelpClick,
    handleCombatHelpClick, handleTheYetHelpClick, handleRelationshipsHelpClick, handleLandVehiclesHelpClick, 
    handleAirVehiclesHelpClick, handleWaterVehiclesHelpClick, handleGearHelpClick, handleSpanGraphHelpClick,
    handleDebugGraphDataClick, handleResetGraphViewClick, handleTimelineSortToggle, handleFixRailOffsetsClick,
    handleExportLifelineClick, handleImportLifelineClick, handlePersonalLocateClick, handlePersonalGrabClick
} from '../sheet-ui-handlers.js';
import { showCreateGoalDialog } from '../span-graph-ui-dialogs.js';
import { openLifelineSpreadsheet } from '../lifeline/spreadsheet/open-lifeline-spreadsheet.js';
import { ITEM_DATA } from '../../item-data.js';

export function activateCharacterListeners(sheet, html) {
    // Select text on focus
    html.find("input[type='text'], input[type='number']").on("focus", event => event.currentTarget.select());

    // --- CHARACTER SPECIFIC TOOLTIPS ---
    html.on('mouseenter', '.experience-title', (event) => {
        ExperienceTooltipService.show(sheet.actor, event.currentTarget, event);
    }).on('mousemove', '.experience-title', (event) => {
        ExperienceTooltipService.updatePosition(event);
    }).on('mouseleave', '.experience-title', () => {
        ExperienceTooltipService.hide();
    });

    // --- DELEGATED LISTENERS ---
    html.on('click', '.item-add', sheet._onItemAdd.bind(sheet));
    html.on('click', '.item-delete, .event-delete', sheet._onItemDelete.bind(sheet));
    html.on('click', '.event-add', sheet._onEventAdd.bind(sheet));
    html.on('change', '.event-toggle-checkbox', sheet._onToggleCheckboxChange.bind(sheet));
    html.on('click', '.sheet-settings-button', sheet._onSettingsClick.bind(sheet));
    html.on('click', '.situation-roll-button', sheet._onSituationClick.bind(sheet));

    // Help Handlers
    html.on('click', '.personal-info-help', handlePersonalHelpClick);
    html.on('click', '.attributes-help', handleAttributesHelpClick);
    html.on('click', '.goals-help', handleGoalsHelpClick);
    html.on('click', '.background-help', handleBackgroundHelpClick);
    html.on('click', '.spanning-help', handleSpanningHelpClick);
    html.on('click', '.metabilities-help', handleMetabilitiesHelpClick);
    html.on('click', '.experiences-help', handleExperiencesHelpClick);
    html.on('click', '.combat-help', handleCombatHelpClick);
    html.on('click', '.the-yet-help', handleTheYetHelpClick);
    html.on('click', '.relationships-help', handleRelationshipsHelpClick);
    html.on('click', '.land-vehicles-help', handleLandVehiclesHelpClick);
    html.on('click', '.air-vehicles-help', handleAirVehiclesHelpClick);
    html.on('click', '.water-vehicles-help', handleWaterVehiclesHelpClick);
    html.on('click', '.gear-help', handleGearHelpClick);
    html.on('click', '.span-graph-help', handleSpanGraphHelpClick);

    // Graph & Data Controls
    html.on('click', '.lifeline-spreadsheet-btn', () => openLifelineSpreadsheet(sheet));
    html.on('click', '.debug-graph-data', (event) => handleDebugGraphDataClick(sheet, event));
    html.on('click', '.export-lifeline', (event) => handleExportLifelineClick(sheet, event));
    html.on('click', '.import-lifeline', (event) => handleImportLifelineClick(sheet, event));
    
    html.on('click', '.reset-graph-view', (event) => {
        event.preventDefault();
        const viewport = sheet._spanGraphViewport;
        if (viewport) {
            viewport.autoFocus();
            ui.notifications.info("Lifeline view reset.");
        }
    });

    html.on('click', '.fix-rail-offsets', (event) => {
        event.preventDefault();
        const viewport = sheet._spanGraphViewport;
        if (viewport) {
            viewport.updateActor(sheet.actor);
            ui.notifications.info("Lifeline rail offsets cleared.");
        } else {
            handleFixRailOffsetsClick(sheet, event);
        }
    });
    // Vehicle select - directly update stats when name changes
    html.on('change', '.vehicle-select', async (ev) => {
        const fieldName = ev.currentTarget.name; // e.g. "system.vehicles.abc123.name"
        const parts = fieldName.split('.');
        const collectionKey = parts[1];
        const id = parts[2];
        const vehicleName = ev.currentTarget.value;
        // Search all collections - the dropdown shows all types regardless of row's systemKey
        const stats = ITEM_DATA.vehicles?.[vehicleName] ?? ITEM_DATA.airVehicles?.[vehicleName] ?? ITEM_DATA.waterVehicles?.[vehicleName];
        if (!stats) return;
        const updates = { [`system.${collectionKey}.${id}.name`]: vehicleName };
        for (const [stat, val] of Object.entries(stats)) {
            updates[`system.${collectionKey}.${id}.${stat}`] = val;
        }
        await sheet.actor.update(updates);
    });

    html.on('click', '.toggle-archived-goals', (event) => {
        const btn = $(event.currentTarget);
        btn.toggleClass('active');
        html.find('.archived-goals-panel').toggleClass('visible');
    });
    html.on('click', '.timeline-sort-toggle', (event) => handleTimelineSortToggle(sheet, event));
    
    // Map Interaction
    html.on('click', '.personal-locate-btn', (event) => handlePersonalLocateClick(sheet, event));
    html.on('click', '.personal-grab-btn', (event) => handlePersonalGrabClick(sheet, event));
    // If the player types a new birthplace text directly, clear stale lat/lng so the
    // map doesn't center on the old location. Geo buttons re-populate them correctly.
    html.on('input', 'input[name="system.personal.birthLocation"]', (event) => {
        const container = $(event.currentTarget).closest('div');
        container.find('input[name="system.personal.birthLat"]').val('');
        container.find('input[name="system.personal.birthLng"]').val('');
    });

    // Metability Application Ingredients
    html.on('input', '.app-ingredient-input', (event) => handleAppIngredientChange(sheet, event));
    html.on('click', '.app-apply-btn', (event) => handleAppApply(sheet, event));
    html.find('.metability-application-item').each(function() { updateVolumeDisplay(sheet, this); });

    // Benefit Checkboxes
    html.on('change', '.benefit-checkbox', async (ev) => {
        const id = ev.currentTarget.dataset.benefitId;
        const checked = ev.currentTarget.checked;
        await sheet.actor.update({ [`system.benefits.${id}`]: checked });
    });

    // Rest Handling
    html.on('change', 'input[name*=".isRest"]', (event) => handleRestToggle(sheet, event));

    // Gear Handling
    html.on('click', '.gear-use-btn', (ev) => handleGearUse(sheet, ev));

    html.on('click', '.gear-item .item-edit', (ev) => {
        const li = $(ev.currentTarget).parents('.gear-item');
        const item = sheet.actor.items.get(li.data('id'));
        if (item) item.sheet.render(true);
    });

    html.on('click', '.gear-item .item-delete', (ev) => {
        ev.stopPropagation();
        const li = $(ev.currentTarget).parents('.gear-item');
        const item = sheet.actor.items.get(li.data('id'));
        if (item) item.delete();
    });

    // Custom firearm edit from combat section
    html.on('click', '.custom-firearm-item .item-edit', (ev) => {
        const itemId = ev.currentTarget.dataset.itemId;
        const item = sheet.actor.items.get(itemId);
        if (item) item.sheet.render(true);
    });

    html.on('change', '.gear-carried-toggle', async (ev) => {
        const itemId = ev.currentTarget.dataset.itemId;
        const item = sheet.actor.items.get(itemId);
        if (item) await item.update({ "system.carried": ev.currentTarget.checked });
    });

    // Token image picker
    html.on('click', '.token-image-pick', (event) => {
        event.preventDefault();
        const current = sheet.actor.prototypeToken?.texture?.src ?? '';
        new FilePicker({
            type: 'image',
            current: current,
            callback: (path) => {
                sheet.actor.update({ 'prototypeToken.texture.src': path });
            }
        }).browse(current);
    });

    // Recalculate Logic
    html.on('click', '.recalculate-span', (event) => {
        event.preventDefault();
        sheet.render();
    });

    // --- LISTENER FOR ADDING GOAL FROM GRAPH ---
    html.on('click', '.goal-hud-add', (event) => {
        event.preventDefault();
        showCreateGoalDialog(sheet);
    });

    // Initialize Sub-Systems
    initializeDragAndDrop(sheet);
    initializeSearch(html, sheet);

    // Gear tab persistence - restore active tab after re-render
    const gearRadios = html.find('.gear-tab-radio');
    if (gearRadios.length) {
        const activeTab = sheet._activeGearTab || 'firearms';
        const targetRadio = gearRadios.filter(`[value="${activeTab}"]`);
        if (targetRadio.length) {
            targetRadio.prop('checked', true).trigger('change');
        } else {
            gearRadios.first().prop('checked', true).trigger('change');
        }
        html.on('change', '.gear-tab-radio', (ev) => {
            sheet._activeGearTab = ev.currentTarget.value;
        });
    }

    /*
    try {
        initializeSpanGraph(html, sheet);
    } catch (err) {
        console.error("Continuum | initializeSpanGraph failed:", err);
    }
    */
    // NOTE: initializeSpanGraph is now handled by the V2 Sheet Integration 
    // in continuum.js calling sheet-handler.js directly.
    initializeDiceRoller(html, sheet);
    initializeSpinners(html, sheet);
    initializeAppSpinners(html, sheet);
    activateDatePickers(html);

    setTimeout(() => {
        if (sheet.rendered) initializeCharRelationshipGraph(sheet);
    }, 150);
}
