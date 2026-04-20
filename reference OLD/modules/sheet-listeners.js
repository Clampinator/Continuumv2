import { initializeDragAndDrop } from '../continuum-drag-drop.js';
import { initializeSpanGraph } from './span-graph-container.js';
import { initializeCharRelationshipGraph } from './char-relationship-graph.js';
import { ITEM_DATA } from '../item-data.js';
import { 
    handleSpanGraphHelpClick, handlePersonalHelpClick, handleAttributesHelpClick, handleGoalsHelpClick,
    handleBackgroundHelpClick, handleSpanningHelpClick, handleMetabilitiesHelpClick, handleExperiencesHelpClick,
    handleCombatHelpClick, handleTheYetHelpClick,
    handleRelationshipsHelpClick, handleLandVehiclesHelpClick, handleAirVehiclesHelpClick, handleWaterVehiclesHelpClick,
    handleGearHelpClick, handleDebugGraphDataClick, handleResetGraphViewClick, handleTimelineSortToggle,
    handleExportLifelineClick, handleImportLifelineClick, handlePersonalLocateClick, handlePersonalGrabClick
} from './sheet-ui-handlers.js';
import { showCreateGoalDialog } from './span-graph-ui-dialogs.js';
import { initializeSearch } from '../sheet-search.js';
import { initializeDiceRoller } from '../sheet-dice-roller.js';
import { initializeSpinners } from './sheet-spinners.js';
import { convertTimestampToDateString } from './span-graph-utils.js';
import { activateDatePickers } from './date-picker.js';
import { ExperienceTooltipService } from './lifeline/services/ui/experience-tooltip-service.js';

/**
 * Activates all event listeners for the actor sheet.
 * @param {ActorSheet} sheet The actor sheet instance.
 * @param {JQuery} html The jQuery object for the sheet's HTML.
 */
export function activateSheetListeners(sheet, html) {
    // Select text on focus for input fields
    html.find("input[type='text'], input[type='number']").on("focus", event => event.currentTarget.select());

    // --- EXPERIENCE TITLE TOOLTIP ---
    html.find('.experience-title').on('mouseenter', (event) => {
        ExperienceTooltipService.show(sheet.actor, event.currentTarget, event);
    }).on('mousemove', (event) => {
        ExperienceTooltipService.updatePosition(event);
    }).on('mouseleave', () => {
        ExperienceTooltipService.hide();
    });

    // --- RESOLVE LOCATION ON ENTER ---
    html.on('keydown', 'input[name*="Location"]', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            const input = $(event.currentTarget);
            const btn = input.closest('div').find('.personal-locate-btn, .locate-btn');
            if (btn.length) btn.click();
        }
    });

    // --- DELEGATED EVENT LISTENERS ---
    html.on('click', '.item-add', sheet._onItemAdd.bind(sheet));
    html.on('click', '.item-delete, .event-delete', sheet._onItemDelete.bind(sheet));
    html.on('click', '.event-add', sheet._onEventAdd.bind(sheet));
    html.on('change', '.event-toggle-checkbox', sheet._onToggleCheckboxChange.bind(sheet));
    html.on('click', '.sheet-settings-button', sheet._onSettingsClick.bind(sheet));
    html.on('click', '.situation-mod', sheet._onSituationClick.bind(sheet));
    
    // --- GEAR EMBEDDED ITEM LISTENERS ---
    html.on('click', '.gear-item .item-edit', (ev) => {
        const li = $(ev.currentTarget).parents(".gear-item");
        const item = sheet.actor.items.get(li.data("id"));
        if (item) item.sheet.render(true);
    });

    html.on('click', '.gear-item .item-delete', (ev) => {
        const li = $(ev.currentTarget).parents(".gear-item");
        const item = sheet.actor.items.get(li.data("id"));
        if (item) item.delete();
    });

    // GEAR CARRIED TOGGLE
    html.on('change', '.gear-carried-toggle', async (ev) => {
        const itemId = ev.currentTarget.dataset.itemId;
        const checked = ev.currentTarget.checked;
        const item = sheet.actor.items.get(itemId);
        if (item) {
            await item.update({ "system.carried": checked });
        }
    });

    // --- LISTENER FOR SPAN RECALCULATE ---
    html.on('click', '.recalculate-span', (event) => {
        event.preventDefault();
        sheet.render();
    });

    // --- LISTENER FOR ADDING GOAL FROM GRAPH ---
    html.on('click', '.goal-hud-add', (event) => {
        event.preventDefault();
        showCreateGoalDialog(sheet);
    });

    // --- HELP & CONTROL BUTTON LISTENERS ---
    html.on('click', '.span-graph-help', handleSpanGraphHelpClick);
    html.on('click', '.debug-graph-data', (event) => handleDebugGraphDataClick(sheet, event));
    html.on('click', '.export-lifeline', (event) => handleExportLifelineClick(sheet, event));
    html.on('click', '.import-lifeline', (event) => handleImportLifelineClick(sheet, event));
    html.on('click', '.reset-graph-view', (event) => handleResetGraphViewClick(sheet, event));
    html.on('click', '.timeline-sort-toggle', (event) => handleTimelineSortToggle(sheet, event));
    
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
    html.on('click', '.vehicles-help', handleLandVehiclesHelpClick);
    html.on('click', '.land-vehicles-help', handleLandVehiclesHelpClick);
    html.on('click', '.air-vehicles-help', handleAirVehiclesHelpClick);
    html.on('click', '.water-vehicles-help', handleWaterVehiclesHelpClick);
    html.on('click', '.gear-help', handleGearHelpClick);

    // --- PERSONAL MAP BUTTONS ---
    html.on('click', '.personal-locate-btn', (event) => handlePersonalLocateClick(sheet, event));
    html.on('click', '.personal-grab-btn', (event) => handlePersonalGrabClick(sheet, event));

    // --- GHOST INPUT HANDLING ---
    html.find('.experience-item.is-clone').each((i, el) => {
        const clone = $(el);
        clone.find('input, select, textarea').each((j, input) => {
            const $input = $(input);
            const name = $input.attr('name');
            if (name) {
                $input.attr('data-ghost-name', name);
                $input.removeAttr('name');
            }
        });
    });

    html.on('change', '[data-ghost-name]', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const el = event.currentTarget;
        const target = el.dataset.ghostName;
        let value = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? Number(el.value) : el.value);
        await sheet.actor.update({ [target]: value });
    });

    // --- INITIALIZE MODULES ---
    initializeDragAndDrop(sheet);
    initializeSearch(html, sheet);
    try {
        initializeSpanGraph(html, sheet);
    } catch (err) {
        console.error("Continuum | initializeSpanGraph failed:", err);
    }
    initializeDiceRoller(html, sheet);
    initializeSpinners(html, sheet);
    activateDatePickers(html);

    // Bootstrap Relationship Map with small delay to allow container layout
    setTimeout(() => {
        if (sheet.rendered) initializeCharRelationshipGraph(sheet);
    }, 150);
	
    html.on("click", ".trauma-toggle", async (event) => {
        event.preventDefault();
        const el = $(event.currentTarget);
        const id = el.data("id");
        const current = el.text().trim();
        const newEmoji = current === "😊" ? "😱" : "😊";
        el.text(newEmoji);
        const flagKey = `sheetState.toggles.trauma-${id}`;
        await sheet.actor.setFlag("continuum", flagKey, newEmoji === "😱");
    });

    // --- Auto-expanding Textareas ---
    function autoExpand(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    html.on('input', 'textarea.js-auto-expand', function() {
        autoExpand(this);
    });

    html.find('textarea.js-auto-expand').each(function() {
        autoExpand(this);
    });

    // --- SPAN LEVEL BUTTON HANDLER ---
    html.on('click', 'label[for*="span-dir-level-"]', (event) => {
        event.preventDefault(); 
        const label = $(event.currentTarget);
        const eventItem = label.closest('.event-item');
        if (!eventItem.length) return;

        const fromDateInput = eventItem.find('input[name*="spanFromDate"]');
        const fromTimeInput = eventItem.find('input[name*="spanFromTime"]');
        const toDateInput = eventItem.find('input[name*="spanToDate"]');
        const toTimeInput = eventItem.find('input[name*="spanToTime"]');
        
        // Manual sync to bypass change events that might not fire correctly in some versions
        toDateInput.val(fromDateInput.val());
        toTimeInput.val(fromTimeInput.val());
        
        // Trigger specific change event for data persistence
        toDateInput[0].dispatchEvent(new Event('change', { bubbles: true }));
    });
}