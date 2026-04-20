
import { prepareOrganizationData } from './modules/organization/org-prepare-data.js';
import { activateOrgListeners } from './modules/organization/org-activate-listeners.js';
import { handleOrgItemAdd } from './modules/organization/org-item-add.js';
import { handleOrgEventAdd } from './modules/organization/org-event-add.js';
import { handleOrgItemDelete } from './modules/organization/org-item-delete.js';
import { handleOrgSettingsClick } from './modules/organization/org-handle-settings.js';
import { handleOrgToggleChange } from './modules/organization/org-handle-toggle.js';
import { handleOrgSituationClick } from './modules/organization/org-handle-situation.js';
import { initializeNetworkGraph } from './modules/organization/org-network-graph.js';
import { initializeOrgMap } from './modules/organization/org-map.js';
import { initializeOrgGraph } from './modules/organization/org-graph/org-graph-logic.js';
import { handleActorDrop } from './modules/network/handle-actor-drop.js';

// V13 Compatibility
const BaseActorSheet = foundry.appv1?.sheets?.ActorSheet ?? ActorSheet;

/**
 * TOTAL DECOUPLING: Organization sheet now extends base ActorSheet directly.
 * Zero dependency on character sheet logic.
 */
export class ContinuumOrganizationSheet extends BaseActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["continuum", "sheet", "actor", "organization"],
      template: "systems/continuum/organization-sheet.html",
      width: 950, 
      height: 950,
      resizable: true,
      closeOnSubmit: false,
      submitOnChange: true, 
      scrollY: [".window-content"],
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "main" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  /** @override */
  async getData(options) {
    const context = await super.getData(options);
    // Augment the base context using the dedicated preparation service
    return await prepareOrganizationData(this, context);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    if (this.isEditable) {
        html.find("img[data-edit]").click(this._onEditImage.bind(this));
        html.find("input").focus(ev => ev.currentTarget.select());
    }

    activateOrgListeners(this, html); 
    
    // Initialize Interactive Map
    setTimeout(() => {
        if (this.rendered) initializeOrgMap(html, this);
    }, 50);

    // Initialize Network Graph (D3)
    setTimeout(() => {
        if (this.rendered) initializeNetworkGraph(this);
    }, 100);

    // Initialize Organizational Lifeline (Subway)
    setTimeout(() => {
        if (this.rendered) initializeOrgGraph(html, this);
    }, 150);
  }

  /** @override */
  async _onDrop(event) {
    const handled = await handleActorDrop(event, this);
    if (handled) return;
    return super._onDrop(event);
  }

  // Domain-specific UI handlers
  async _onSettingsClick(event) { return handleOrgSettingsClick(this, event); }
  _onToggleCheckboxChange(event) { return handleOrgToggleChange(this, event); }
  _onSituationClick(event) { return handleOrgSituationClick(this, event); }
  async _onItemAdd(event) { return handleOrgItemAdd(this, event); }
  async _onEventAdd(event) { return handleOrgEventAdd(this, event); }
  async _onItemDelete(event) { return handleOrgItemDelete(this, event); }

  /** @override */
  async _render(force = false, options = {}) {
    this.element?.addClass('no-transitions');
    if (this.element) {
      options.continuumScrollTop = this.element.find('.window-content').scrollTop();
      const checkedToggles = {};
      this.element.find('.event-toggle-checkbox').each((i, el) => {
        if (el.id) checkedToggles[el.id] = el.checked;
      });
      options.checkedToggles = checkedToggles;
    }
    await super._render(force, options);
    if (options.checkedToggles) {
      this.element.find('.event-toggle-checkbox').each((i, el) => {
        if (el.id && options.checkedToggles[el.id] !== undefined) el.checked = options.checkedToggles[el.id];
      });
    }
    if (options.continuumScrollTop) this.element.find('.window-content').scrollTop(options.continuumScrollTop);
    setTimeout(() => this.element?.removeClass('no-transitions'), 0);
  }

  _saveScrollPositions(html) { return {}; }
  _restoreScrollPositions(html, positions) { }
}
