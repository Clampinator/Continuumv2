
import { prepareLocationData } from './modules/location/prepare-data.js';
import { activateLocationListeners } from './modules/location/activate-listeners.js';

const BaseActorSheet = foundry.appv1.sheets.ActorSheet;

export class ContinuumLocationSheet extends BaseActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["continuum-v2", "sheet", "actor", "location"],
      template: "systems/continuum-v2/templates/location-sheet.html",
      width: 900,
      height: 850,
      resizable: true,
      closeOnSubmit: false,
      submitOnChange: true,
      scrollY: [".window-content"]
    });
  }

  /** @override */
  async getData(options) {
    const context = await super.getData(options);
    const prepared = await prepareLocationData(this, context);
    console.log("Continuum | Location Sheet Context:", prepared);
    return prepared;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    activateLocationListeners(this, html);
  }

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
}
