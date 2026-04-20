import { initializeGearSpinner } from './modules/initialize-gear-spinner.js';
import { ITEM_DATA } from './item-data.js';

const ASPECT_LABELS = {
    firearm: { aspect1: 'Handling', aspect2: 'Ammo', aspect3: 'Reliability' },
    technology: { aspect1: 'Speed', aspect2: 'Capacity', aspect3: 'Connectivity' },
    tool: { aspect1: 'Quality', aspect2: 'Versatility', aspect3: 'Durability' },
    vehicle: { aspect1: 'Handling', aspect2: 'Acceleration', aspect3: 'Prestige' }
};

const GEAR_DEFAULTS = {
    gearType: 'technology',
    vehicleClass: '',
    firearmModel: '',
    aspects: { aspect1: 0, aspect2: 0, aspect3: 0 }
};

const BaseItemSheet = foundry.appv1?.sheets?.ItemSheet ?? ItemSheet;

export class ContinuumItemSheet extends BaseItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["continuum", "sheet", "item"],
      width: 520,
      height: 550,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  get template() {
    return `systems/continuum/templates/items/item-${this.item.type}-sheet.html`;
  }

  async getData() {
    const context = await super.getData();
    context.system = context.item.system;

    if (this.item.type === 'gear') {
      const sys = context.system;

      // Fill in defaults for display if fields are missing
      // (happens on newly created items before schema migration)
      if (!sys.gearType) sys.gearType = GEAR_DEFAULTS.gearType;
      if (!sys.vehicleClass) sys.vehicleClass = GEAR_DEFAULTS.vehicleClass;
      if (!sys.firearmModel) sys.firearmModel = GEAR_DEFAULTS.firearmModel;
      if (!sys.aspects || typeof sys.aspects !== 'object') {
        sys.aspects = foundry.utils.deepClone(GEAR_DEFAULTS.aspects);
      }
      if (sys.aspects.aspect1 === undefined || sys.aspects.aspect1 === null) sys.aspects.aspect1 = 0;
      if (sys.aspects.aspect2 === undefined || sys.aspects.aspect2 === null) sys.aspects.aspect2 = 0;
      if (sys.aspects.aspect3 === undefined || sys.aspects.aspect3 === null) sys.aspects.aspect3 = 0;

      const gearType = sys.gearType || 'technology';
      context.aspectLabels = ASPECT_LABELS[gearType] || ASPECT_LABELS.technology;
      const a1 = Number(sys.aspects.aspect1) || 0;
      const a2 = Number(sys.aspects.aspect2) || 0;
      const a3 = Number(sys.aspects.aspect3) || 0;
      context.computedBonus = Math.floor((a1 + a2 + a3) / 3);
      context.rangedWeaponModels = Object.keys(ITEM_DATA.rangedWeapons).filter(k => k !== 'none');
      context.selectedFirearmStats = null;
      const model = sys.firearmModel;
      if (model && ITEM_DATA.rangedWeapons[model]) {
        context.selectedFirearmStats = ITEM_DATA.rangedWeapons[model];
      }
    }

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find("input[type='text'], input[type='number']").on("focus", event => event.currentTarget.select());

    if (this.item.type === 'gear') {
      // Migrate missing fields on first interaction
      this._migrateGearFields();

      initializeGearSpinner(html, this.item);

      html.find('.gear-type-select').on('change', async (event) => {
        const newType = event.currentTarget.value;
        await this.item.update({ 'system.gearType': newType });
        this.render();
      });

      html.find('input[name="system.vehicleClass"]').on('change', async (event) => {
        const newClass = event.currentTarget.value;
        await this.item.update({ 'system.vehicleClass': newClass });
      });

      html.find('.firearm-model-select').on('change', async (event) => {
        const model = event.currentTarget.value;
        if (model && ITEM_DATA.rangedWeapons[model]) {
            const stats = ITEM_DATA.rangedWeapons[model];
            await this.item.update({
                'system.firearmModel': model,
                'system.weight': stats.weight
            });
        } else {
            await this.item.update({ 'system.firearmModel': '' });
        }
      });

      html.find('.gear-aspect-btn').on('click', async (event) => {
        const btn = $(event.currentTarget);
        const aspect = btn.data('aspect');
        const isInc = btn.hasClass('gear-aspect-inc');
        const currentVal = Number(this.item.system.aspects?.[aspect]) || 0;
        const newVal = Math.max(0, Math.min(3, currentVal + (isInc ? 1 : -1)));
        await this.item.update({ [`system.aspects.${aspect}`]: newVal });
      });
    }
  }

  async _migrateGearFields() {
    const sys = this.item.system;
    const update = {};
    if (sys.gearType === undefined) update['system.gearType'] = GEAR_DEFAULTS.gearType;
    if (sys.vehicleClass === undefined) update['system.vehicleClass'] = GEAR_DEFAULTS.vehicleClass;
    if (sys.firearmModel === undefined) update['system.firearmModel'] = GEAR_DEFAULTS.firearmModel;
    if (sys.aspects === undefined) update['system.aspects'] = foundry.utils.deepClone(GEAR_DEFAULTS.aspects);
    if (Object.keys(update).length) {
      await this.item.update(update, { render: false, diff: false });
    }
  }
}