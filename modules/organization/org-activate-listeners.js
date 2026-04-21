
import { initializeNetworkGraph } from './org-network-graph.js';
import { initializeOrgOperationalLifeline } from './org-operational-lifeline.js';
import { initializeOrgGraph } from './org-graph/org-graph-logic.js';
import { activateDatePickers } from '../date-picker.js';
import { initializeSpinners } from '../sheet-spinners.js';
import { handleRestToggle } from '../lifeline/services/ui/handle-rest-toggle.js';
import { handleOrgLocateClick, handleOrgGrabClick } from './org-sheet-handlers-map.js';
import { showCreateMandateDialog } from './org-dialog-create-mandate.js';
import { showUnitSettingsDialog } from './org-dialog-unit-settings.js';

/**
 * Activates listeners for the Organization domain.
 * Isolated from character sheet interactions.
 */
export function activateOrgListeners(sheet, html) {
    // Select text on focus
    html.find("input[type='text'], input[type='number']").on("focus", event => event.currentTarget.select());

    // --- DELEGATED LISTENERS ---
    html.on('click', '.item-add', sheet._onItemAdd.bind(sheet));
    html.on('click', '.item-delete', sheet._onItemDelete.bind(sheet));
    html.on('click', '.event-add', sheet._onEventAdd.bind(sheet));
    html.on('change', '.event-toggle-checkbox', sheet._onToggleCheckboxChange.bind(sheet));
    html.on('click', '.sheet-settings-button', sheet._onSettingsClick.bind(sheet));
    html.on('click', '.roll-attribute', sheet._onSituationClick.bind(sheet));

    // Mandate creation
    html.on('click', '.goal-hud-add', (event) => {
        event.preventDefault();
        showCreateMandateDialog(sheet);
    });

    // Map Interaction (Headquarters)
    html.on('click', '.personal-locate-btn', (event) => handleOrgLocateClick(sheet, event));
    html.on('click', '.personal-grab-btn', (event) => handleOrgGrabClick(sheet, event));

    // Rest Handling
    html.on('change', 'input[name*=".isRest"]', (event) => handleRestToggle(sheet, event));

    // Commander slot: allow actor drops
    html.on('dragover', '.commander-slot', (event) => {
        event.preventDefault();
        event.originalEvent.dataTransfer.dropEffect = 'copy';
    });

    // Commander slot: drop a character actor to assign as commander
    html.on('drop', '.commander-slot', async (event) => {
        event.stopPropagation();
        event.preventDefault();
        let dragData;
        try {
            dragData = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
        } catch { return; }
        if (dragData.type !== 'Actor') return;
        const actor = await fromUuid(dragData.uuid);
        if (!actor || actor.type !== 'character') {
            return ui.notifications.warn("Only character actors can be assigned as unit commanders.");
        }
        const slot = event.currentTarget;
        await sheet.actor.update({
            [`system.conflict.${slot.dataset.unitType}.${slot.dataset.unitId}.commanderId`]: actor.id,
            [`system.conflict.${slot.dataset.unitType}.${slot.dataset.unitId}.commanderName`]: actor.name
        });
    });

    // Commander slot: click to unlink
    html.on('click', '.commander-slot.has-commander', async (event) => {
        const slot = event.currentTarget;
        await sheet.actor.update({
            [`system.conflict.${slot.dataset.unitType}.${slot.dataset.unitId}.commanderId`]: null,
            [`system.conflict.${slot.dataset.unitType}.${slot.dataset.unitId}.commanderName`]: null
        });
    });

    // Unit settings
    html.on('click', '.unit-settings-btn', (event) => {
        event.preventDefault();
        const btn = event.currentTarget;
        const unitId   = btn.dataset.unitId;
        const unitType = btn.dataset.unitType;
        const unit     = sheet.actor.system.conflict?.[unitType]?.[unitId];
        if (unit) showUnitSettingsDialog(sheet, unitId, unitType, unit);
    });

    // Initializations
    activateDatePickers(html);
    initializeSpinners(html, sheet);

    // Initial Fit/Render — run unconditionally.
    // Note: sheet.rendered is false on the FIRST activateListeners call (Foundry
    // sets it to true only after activateListeners returns), so guarding on
    // sheet.rendered would silently skip initialization on first open.
    initializeOrgOperationalLifeline(html, sheet);
    initializeNetworkGraph(sheet);
    initializeOrgGraph(html, sheet);
}
