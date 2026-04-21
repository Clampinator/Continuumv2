
import { initializeSpanGraph } from './modules/span-graph/integration/sheet-handler.js';

// ... (rest of imports remains similar, but I'll add the new one at top)
import { prepareCharacterData } from './modules/character/prepare-data.js';
import { activateCharacterListeners } from './modules/character/activate-listeners.js';
// ... (omitting middle imports for brevity in thought, but I must provide exact literal)
import { handleCharacterItemAdd } from './modules/character/item-add.js';
import { handleCharacterEventAdd } from './modules/character/event-add.js';
import { handleCharacterItemDelete } from './modules/character/item-delete.js';
import { handleCharacterSettingsClick } from './modules/character/handle-settings.js';
import { handleCharacterToggleChange } from './modules/character/handle-toggle.js';
import { handleCharacterSituationClick } from './modules/character/handle-situation.js';
import { deleteSheetContext } from './modules/graph-state.js';
import { ITEM_DATA } from './item-data.js';
import { normalizeDateInput } from './modules/span-graph-utils/provide-span-graph-utils.js';
import { handleActorDrop } from './modules/network/handle-actor-drop.js';

// V13 Compatibility
const BaseActorSheet = foundry.appv1.sheets.ActorSheet;

Hooks.once('init', () => {
  // Register Handlebars Helpers
  Handlebars.registerHelper('resourceState', function(actor, size) {
    if (!actor || !size) return "";
    
    const externalRep = Number(foundry.utils.getProperty(actor, "system.attributes.externalReputation.value")) || 0;
    const sizeMatch = size.match(/\d+/);
    const unitTier = sizeMatch ? parseInt(sizeMatch[0]) : 0;

    if (unitTier > externalRep) {
      return new Handlebars.SafeString(`<span class="unit-status-gated" title="Gated by External Reputation"><i class="fas fa-lock"></i> Gated</span>`);
    }
    return "";
  });
});

export class ContinuumActorSheet extends BaseActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["continuum-v2", "sheet", "actor", "character"],
      template: "systems/continuum-v2/templates/actor-sheet.html",
      width: 850,
      height: 950,
      resizable: true,
      closeOnSubmit: false,
      submitOnChange: true,
      scrollY: [".window-content"],
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "main" }],
      dragDrop: [{ dragSelector: ".draggable-item", dropSelector: null }]
    });
  }

  /** @override */
  async getData(options) {
    return prepareCharacterData(this, options);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    activateCharacterListeners(this, html);
    initializeSpanGraph(this.actor, html, this);
  }

  /** @override */
  async _onDrop(event) {
    const handled = await handleActorDrop(event, this);
    if (handled) return;
    return super._onDrop(event);
  }

  _updateMetabilityInfo(metabilityName, rank) {
    const displayRank = rank === 0 ? 1 : rank;
    const rankData = ITEM_DATA.metabilities[metabilityName]?.ranks[displayRank];
    if (!rankData) {
      this.element.find('.info-box p').html('—');
      return;
    }
    this.element.find('.info-box').each((_, boxEl) => {
      const box = $(boxEl);
      const key = box.data('key');
      const value = rankData[key] || '—';
      box.find('p').html(value);
    });
  }

  async _onSettingsClick(event) { return handleCharacterSettingsClick(this, event); }
  _onToggleCheckboxChange(event) { return handleCharacterToggleChange(this, event); }
  _onSituationClick(event) { return handleCharacterSituationClick(this, event); }
  async _onItemAdd(event) { return handleCharacterItemAdd(this, event); }
  async _onEventAdd(event) { return handleCharacterEventAdd(this, event); }
  async _onItemDelete(event) { return handleCharacterItemDelete(this, event); }

  /** @override */
  async _updateObject(event, formData) {
    for (const key in formData) {
        const value = formData[key];
        if (typeof value === 'string' && value.includes('\n')) {
            formData[key] = value.split('\n').map(line => line.trimStart()).join('\n');
        }
        if (typeof value === 'string' && /(date|dob|when|inceptionDate|dateofbirth)$/i.test(key)) {
            formData[key] = normalizeDateInput(value);
        }
    }
    
    // SYNC NAME: Ensure nested system name matches primary document name if edited
    if (formData.name) {
        formData['system.personal.name'] = formData.name;
    }

    const expandedData = foundry.utils.expandObject(formData);
    const updates = {};
    for (const [key, value] of Object.entries(expandedData.system || {})) {
        if (key === 'combat') {
            for (const [itemType, items] of Object.entries(value)) {
                if (itemType !== 'rangedWeapons' && itemType !== 'meleeWeapons' && itemType !== 'armor') continue;
                for (const [id, item] of Object.entries(items)) {
                    if (item.name) {
                        const itemCollection = ITEM_DATA[itemType];
                        const selectedItemData = itemCollection ? itemCollection[item.name] : null;
                        if (selectedItemData) {
                            const pathPrefix = `system.combat.${itemType}.${id}`;
                            for (const [stat, statValue] of Object.entries(selectedItemData)) {
                                updates[`${pathPrefix}.${stat}`] = statValue;
                            }
                        }
                    }
                }
            }
        }
        if (['vehicles', 'airVehicles', 'waterVehicles'].includes(key)) {
            for (const [id, item] of Object.entries(value)) {
                if (item.name) {
                    const selectedItemData = ITEM_DATA.vehicles?.[item.name] ?? ITEM_DATA.airVehicles?.[item.name] ?? ITEM_DATA.waterVehicles?.[item.name] ?? null;
                    if (selectedItemData) {
                        const pathPrefix = `system.${key}.${id}`;
                        for (const [stat, statValue] of Object.entries(selectedItemData)) {
                            updates[`${pathPrefix}.${stat}`] = statValue;
                        }
                    }
                }
            }
        }
    }
    if (Object.keys(updates).length > 0) foundry.utils.mergeObject(formData, updates);
    return super._updateObject(event, formData);
  }

  /** @override */
  async close(options={}) {
      deleteSheetContext(this);
      return super.close(options);
  }

  /** @override */
  async _render(force = false, options = {}) {
    this.element?.addClass('no-transitions');
    if (this.element) {
      options.continuumScrollTop = this.element.find('.window-content').scrollTop();
      const checkedToggles = {};
      this.element.find('.event-toggle-checkbox, .trauma-toggle-cb').each((i, el) => {
        if (el.id) checkedToggles[el.id] = el.checked;
      });
      options.checkedToggles = checkedToggles;
    }
    try {
      await super._render(force, options);
      if (options.checkedToggles) {
        this.element.find('.event-toggle-checkbox, .trauma-toggle-cb').each((i, el) => {
          if (el.id && options.checkedToggles[el.id] !== undefined) el.checked = options.checkedToggles[el.id];
        });
      }
      if (options.continuumScrollTop) this.element.find('.window-content').scrollTop(options.continuumScrollTop);
    } finally {
      setTimeout(() => this.element?.removeClass('no-transitions'), 0);
    }
  }

  _saveScrollPositions(html) { return {}; }
  _restoreScrollPositions(html, positions) { }
}
