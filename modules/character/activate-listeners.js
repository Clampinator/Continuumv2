
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
    handleExportLifelineClick, handleImportLifelineClick, handlePersonalLocateClick, handlePersonalGrabClick,
    handlePersonalTokenClick
} from '../sheet-ui-handlers.js';
import { openLifelineSpreadsheet } from '../lifeline/spreadsheet/open-lifeline-spreadsheet.js';
import { undo, redo } from '../lifeline/undo-manager.js';
import { ITEM_DATA } from '../../item-data.js';
import { resolveVehicleStats } from '/systems/continuum-v2/modules/temporal-kernel/resolve-vehicle-stats.js';

export function activateCharacterListeners(sheet, html) {
    // Select text on focus
    html.find("input[type='text'], input[type='number']").on("focus", event => event.currentTarget.select());

    // --- CHARACTER SPECIFIC TOOLTIPS ---
    html.on('mouseenter', '.experience-eventTitle', (event) => {
        ExperienceTooltipService.show(sheet.actor, event.currentTarget, event);
    }).on('mousemove', '.experience-eventTitle', (event) => {
        ExperienceTooltipService.updatePosition(event);
    }).on('mouseleave', '.experience-eventTitle', () => {
        ExperienceTooltipService.hide();
    });

    // --- DELEGATED LISTENERS ---
    html.on('click', '.item-add', sheet._onItemAdd.bind(sheet));
    html.on('click', '.item-delete, .event-delete', sheet._onItemDelete.bind(sheet));
    html.on('click', '.event-add', sheet._onEventAdd.bind(sheet));
    html.on('change', '.event-toggle-checkbox', sheet._onToggleCheckboxChange.bind(sheet));
    html.on('click', '.sheet-settings-button', sheet._onSettingsClick.bind(sheet));
    html.on('click', '.situation-roll-button', sheet._onSituationClick.bind(sheet));

    // LEVEL UP: Handle progression level-up button clicks.
    // The kernel determines which aspects are eligible. Clicking the
    // button increments the aspect value by 1 on the actor.
    html.on('click', '.level-up-btn', async (event) => {
        event.preventDefault();
        const btn = event.currentTarget;
        const aspect = btn.dataset.aspect;
        if (!aspect) return;

        // Determine if this is an attribute or metability
        const ATTRIBUTE_KEYS = ['force', 'analyze', 'relate', 'react'];
        const isAttribute = ATTRIBUTE_KEYS.includes(aspect);

        if (isAttribute) {
            const currentVal = Number(sheet.actor.system.attributes[aspect]?.value) || 0;
            if (currentVal <= 0) {
                ui.notifications.warn(`Cannot level up ${aspect}: current value is ${currentVal}. This usually means the attribute was not saved correctly.`);
                return;
            }
            await sheet.actor.update({ [`system.attributes.${aspect}.value`]: currentVal + 1 });
        } else {
            // Metabilities: clamp to potential
            const currentVal = Number(sheet.actor.system.metabilities[aspect]?.value) || 0;
            const potential = Number(sheet.actor.system.metabilities[aspect]?.potential) || 0;
            const newVal = Math.min(currentVal + 1, potential);
            await sheet.actor.update({ [`system.metabilities.${aspect}.value`]: newVal });
        }

        ui.notifications.info(`${aspect.charAt(0).toUpperCase() + aspect.slice(1)} leveled up!`);
    });

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

    // Undo / Redo
    html.on('click', '.lifeline-undo', async (event) => {
        event.preventDefault();
        const did = await undo(sheet.actor);
        if (!did) ui.notifications.info(game.i18n.localize("CONTINUUM.Notifications.NothingToUndo"));
    });
    html.on('click', '.lifeline-redo', async (event) => {
        event.preventDefault();
        const did = await redo(sheet.actor);
        if (!did) ui.notifications.info(game.i18n.localize("CONTINUUM.Notifications.NothingToRedo"));
    });

    // CTRL+Z / CTRL+Y anywhere in the sheet (skips when an input has focus)
    const actorId = sheet.actor.id;
    $(document).off(`keydown.lifelineUndo-${actorId}`);
    $(document).on(`keydown.lifelineUndo-${actorId}`, async (event) => {
        if (!event.ctrlKey && !event.metaKey) return;
        const tag = (event.target?.tagName ?? '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        const sheetEl = sheet.element?.[0];
        if (!sheetEl || !sheetEl.contains(event.target)) return;
        if (event.key === 'z' || event.key === 'Z') {
            event.preventDefault();
            const did = await undo(sheet.actor);
            if (!did) ui.notifications.info(game.i18n.localize("CONTINUUM.Notifications.NothingToUndo"));
        } else if (event.key === 'y' || event.key === 'Y') {
            event.preventDefault();
            const did = await redo(sheet.actor);
            if (!did) ui.notifications.info(game.i18n.localize("CONTINUUM.Notifications.NothingToRedo"));
        }
    });

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
            ui.notifications.info(game.i18n.localize("CONTINUUM.Notifications.LifelineViewReset"));
        }
    });

    html.on('click', '.fix-rail-offsets', (event) => {
        event.preventDefault();
        const viewport = sheet._spanGraphViewport;
        if (viewport) {
            viewport.updateActor(sheet.actor);
            ui.notifications.info(game.i18n.localize("CONTINUUM.Notifications.LifelineRailOffsetsCleared"));
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
        // Search all collections via kernel function
        const stats = resolveVehicleStats(vehicleName, ITEM_DATA);
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
    // ENTER on birthplace input triggers Locate button
    html.on('keydown', 'input[name*="Location"], input[name*="location"]', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            const input = $(event.currentTarget);
            const btn = input.closest('div').find('.personal-locate-btn, .locate-btn');
            if (btn.length) btn.click();
        }
    });

    html.on('click', '.personal-locate-btn', (event) => handlePersonalLocateClick(sheet, event));
    html.on('click', '.personal-grab-btn', (event) => handlePersonalGrabClick(sheet, event));
    html.on('click', '.personal-token-btn', (event) => handlePersonalTokenClick(sheet, event));
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
    html.on('change', 'input[name*=".eventIsRest"]', (event) => handleRestToggle(sheet, event));

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

    // --- GOAL HUD: Handled by span-graph interaction/goal-listeners.js ---
    // The goal-hud-add button, goal chip hover, click-to-edit, and drag-to-link
    // are all managed by the goal-listeners module attached via sheet-handler.js.

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

/**
 * Populates progression thermometer bars inside attribute and metability blocks.
 * Reads kernel-computed progression data from the sheet context and renders
 * a fill bar + year count + level-up button inside each .progress-thermo div.
 * Also applies a glowing border to blocks eligible for level-up.
 */
export function _populateProgressionThermometers(html, sheet) {
    // AUTHORITY: Always prefer the viewport's engine-computed progression.
    let progression = null;
    let eligibleLevelUps = [];
    const vpProg = sheet._spanGraphViewport?.latestState?.progression;
    console.log('Continuum | Thermometer: vpProgression=' + !!vpProg + ', cachedProgression=' + !!sheet._progressionData + ', viewport=' + !!sheet._spanGraphViewport + ', latestState=' + !!sheet._spanGraphViewport?.latestState);

    if (vpProg) {
        progression = vpProg;
        eligibleLevelUps = vpProg._eligibleLevelUps || [];
    } else {
        progression = sheet._progressionData;
        eligibleLevelUps = sheet._eligibleLevelUpsData || [];
    }

    // Cache the result for reuse
    sheet._progressionData = progression;
    sheet._eligibleLevelUpsData = eligibleLevelUps;

    if (!progression) return;

    // Log actual values once per call
    const keys = ['force', 'analyze', 'relate', 'react'];
    const vals = keys.map(k => `${k}=${progression[k]?.progressYears ?? '?'}/${progression[k]?.nextLevelCost ?? '?'}`).join(', ');
    console.log('Continuum | Thermometer values: ' + vals);

    const ATTRIBUTE_KEYS = ['force', 'analyze', 'relate', 'react'];
    const META_KEYS = ['coercion', 'creativity', 'farsense', 'pk', 'redaction'];
    const isAttribute = (key) => ATTRIBUTE_KEYS.includes(key);

    // Process attribute thermometer divs
    html.find('.progress-thermo').each(function () {
        const thermo = $(this);
        const aspect = thermo.data('aspect');
        if (!aspect || !progression[aspect]) return;

        const p = progression[aspect];
        const percent = p.nextLevelCost > 0 ? Math.min(100, Math.round((p.progressYears / p.nextLevelCost) * 100)) : 0;
        const eligible = eligibleLevelUps.some(lu => lu.aspect === aspect);
        const fillClass = isAttribute(aspect) ? 'attr-fill' : 'meta-fill';

        // Clear existing content
        thermo.empty();

        // Fill bar
        const fill = $(`<div class="progress-thermo-fill ${fillClass}"></div>`);
        fill.css('width', percent + '%');
        thermo.append(fill);

        // Year label
        const label = $(`<div class="progress-thermo-label">${p.progressYears}/${p.nextLevelCost}yr</div>`);
        thermo.append(label);

        // Level-up button if eligible
        if (eligible) {
            const btn = $(`<button type="button" class="level-up-btn" data-aspect="${aspect}" data-tooltip="Level Up!"><i class="fas fa-arrow-up"></i></button>`);
            thermo.append(btn);
        }

        // Add glow border to the parent attribute/metability block
        if (eligible) {
            thermo.closest('.attribute-block, .metability-potential-frame').addClass('progress-ready');
        }
    });

    // Also handle metability thermometer divs (added via template)
    html.find('.progress-thermo-meta').each(function () {
        const thermo = $(this);
        const aspect = thermo.data('aspect');
        if (!aspect || !progression[aspect]) return;

        const p = progression[aspect];
        const percent = p.nextLevelCost > 0 ? Math.min(100, Math.round((p.progressYears / p.nextLevelCost) * 100)) : 0;
        const potential = Number(sheet.actor.system.metabilities[aspect]?.potential) || 0;
        const atPotential = p.currentLevel >= potential && potential > 0;
        const eligible = eligibleLevelUps.some(lu => lu.aspect === aspect) && !atPotential;

        thermo.empty();

        const fill = $(`<div class="progress-thermo-fill meta-fill"></div>`);
        fill.css('width', percent + '%');
        thermo.append(fill);

        const label = $(`<div class="progress-thermo-label">${p.progressYears}/${p.nextLevelCost}yr</div>`);
        thermo.append(label);

        if (eligible) {
            const btn = $(`<button type="button" class="level-up-btn" data-aspect="${aspect}" data-tooltip="Level Up!"><i class="fas fa-arrow-up"></i></button>`);
            thermo.append(btn);
        }

        if (eligible) {
            thermo.closest('.metability-potential-frame').addClass('progress-ready');
        }
    });
}
