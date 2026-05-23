
import { ContinuumActorSheet } from '../continuum.js';
import { ContinuumOrganizationSheet } from '../organization-sheet.js';
import { ContinuumLocationSheet } from '../location-sheet.js';
import { ContinuumItemSheet } from '../item-sheet.js';
import { api } from '../system-api.js';
import { initCombatSocket } from './combat/combat-socket.js';
import { registerSceneControl } from './npc-generator/scene-controls.js';
import { runLifelineAudit } from './lifeline/services/lifeline-audit.js';
import { migrateAttributeRename } from './migration/attribute-rename.js';

/**
 * Pre-loads Handlebars partials.
 */
async function preloadHandlebarsTemplates() {
  const templatePaths = [
    "systems/continuum-v2/templates/sections/personal.html",
    "systems/continuum-v2/templates/sections/attributes.html",
    "systems/continuum-v2/templates/sections/background.html",
    "systems/continuum-v2/templates/sections/goals.html",
    "systems/continuum-v2/templates/sections/spanning.html",
    "systems/continuum-v2/templates/sections/metabilities.html",
    "systems/continuum-v2/templates/sections/experiences.html",
    "systems/continuum-v2/templates/sections/span_graph.html",
    "systems/continuum-v2/templates/sections/combat.html",
    "systems/continuum-v2/templates/sections/the_yet.html",
    "systems/continuum-v2/templates/sections/favors.html",
    "systems/continuum-v2/templates/sections/relationships.html",
    "systems/continuum-v2/templates/sections/char-relationships-map.html",
    "systems/continuum-v2/templates/sections/vehicles.html",
    "systems/continuum-v2/templates/sections/gear.html",
    "systems/continuum-v2/templates/items/item-gear-sheet.html",
    "systems/continuum-v2/templates/items/item-artifact-sheet.html",
    "systems/continuum-v2/templates/items/item-ability-sheet.html",
    "systems/continuum-v2/templates/sections/org-structure.html",
    "systems/continuum-v2/templates/sections/org-attributes.html",
    "systems/continuum-v2/templates/sections/org-mandates.html",
    "systems/continuum-v2/templates/sections/org-methods.html",
    "systems/continuum-v2/templates/sections/org-conflict.html",
    "systems/continuum-v2/templates/sections/org-balance-sheet.html",
    "systems/continuum-v2/templates/sections/org-network.html",
    "systems/continuum-v2/templates/sections/location-details.html",
    "systems/continuum-v2/templates/sections/location-attributes.html",
    "systems/continuum-v2/templates/sections/location-aspects.html",
    "systems/continuum-v2/templates/sections/location-map.html",
    "systems/continuum-v2/templates/location-sheet.html",
    "systems/continuum-v2/templates/npc-generator/step-1-identity.html",
    "systems/continuum-v2/templates/npc-generator/step-2-time-faction.html",
    "systems/continuum-v2/templates/npc-generator/step-3-capabilities.html",
    "systems/continuum-v2/templates/npc-generator/step-4-concept.html",
    "systems/continuum-v2/templates/npc-generator/step-5-review.html"
  ];
  
  const loadTemplatesFn = foundry.applications?.handlebars?.loadTemplates ?? globalThis.loadTemplates;
  return loadTemplatesFn(templatePaths);
}

Hooks.once('init', async () => {


  game.settings.register('continuum-v2', 'googleMapsApiKey_v3', {
    name: game.i18n.localize("CONTINUUM.Settings.GoogleMapsApiKey"),
    hint: game.i18n.localize("CONTINUUM.Settings.GoogleMapsApiKeyHint"),
    scope: 'world',
    config: true,
    type: String,
    default: "",
    onChange: () => window.location.reload()
  });

  game.settings.register('continuum-v2', 'aiProvider', {
    name: game.i18n.localize("CONTINUUM.Settings.AiProvider"),
    hint: game.i18n.localize("CONTINUUM.Settings.AiProviderHint"),
    scope: 'world',
    config: true,
    type: String,
    choices: {
      gemini: game.i18n.localize("CONTINUUM.Settings.AiProviderGemini"),
      openrouter: game.i18n.localize("CONTINUUM.Settings.AiProviderOpenRouter")
    },
    default: "gemini"
  });

  game.settings.register('continuum-v2', 'geminiApiKey', {
    name: game.i18n.localize("CONTINUUM.Settings.AiApiKey"),
    hint: game.i18n.localize("CONTINUUM.Settings.AiApiKeyHint"),
    scope: 'world',
    config: true,
    type: String,
    default: ""
  });

  game.settings.register('continuum-v2', 'stabilityAiKey', {
    name: game.i18n.localize("CONTINUUM.Settings.StabilityAiKey"),
    hint: game.i18n.localize("CONTINUUM.Settings.StabilityAiKeyHint"),
    scope: 'world',
    config: true,
    type: String,
    default: ""
  });

  game.system.api = api;
  await preloadHandlebarsTemplates();

  const ActorsCol = foundry.documents?.collections?.Actors ?? Actors;
  const ItemsCol = foundry.documents?.collections?.Items ?? Items;

  ActorsCol.registerSheet('continuum-v2', ContinuumActorSheet, {
    types: ['character'],
    makeDefault: true,
    label: game.i18n.localize("CONTINUUM.SheetLabels.Character")
  });

  ActorsCol.registerSheet('continuum-v2', ContinuumOrganizationSheet, {
    types: ['organization'],
    makeDefault: true,
    label: game.i18n.localize("CONTINUUM.SheetLabels.Organization")
  });

  ActorsCol.registerSheet('continuum-v2', ContinuumLocationSheet, {
    types: ['location'],
    makeDefault: true,
    label: game.i18n.localize("CONTINUUM.SheetLabels.Location")
  });

  ItemsCol.registerSheet('continuum-v2', ContinuumItemSheet, {
    types: ['gear', 'artifact', 'ability'],
    makeDefault: true,
    label: game.i18n.localize("CONTINUUM.SheetLabels.Item")
  });

  Handlebars.registerHelper('concat', function(...args) { return args.slice(0, -1).join(''); });
  Handlebars.registerHelper('eq', function(a, b) { return a == b; });
  Handlebars.registerHelper('metaLabel', function(rank) {
    const key = `CONTINUUM.MetaLabels.${rank}`;
    const localized = game.i18n.localize(key);
    // If localization returns the key itself (not found), use fallback
    if (localized === key) return game.i18n.format("CONTINUUM.MetaLabels.RankFallback", { rank });
    return localized;
  });
  Handlebars.registerHelper('add', function(a, b) { return Number(a) + Number(b); });
  Handlebars.registerHelper('multiply', function(a, b) { return Number(a) * Number(b); });
  Handlebars.registerHelper('gte', function(a, b) { return Number(a) >= Number(b); });
  Handlebars.registerHelper('lt', function(a, b) { return Number(a) < Number(b); });
  Handlebars.registerHelper('gt', function(a, b) { return Number(a) > Number(b); });
  Handlebars.registerHelper('isDeletable', function(item, type) {
    if (!item) return true;
    const safeTrim = (val) => String(val || '').trim();
    const val = safeTrim(item.name || item.description || item.eventTitle);
    return !val || val.toLowerCase() === 'none';
  });

  registerSceneControl();
});

Hooks.on('createItem', (item) => {
  if (item.type !== 'gear') return;
  // Only prompt for newly created items, not items being copied/imported
  // A freshly created item has a default name like "New Gear" or "New Item"
  const name = (item.name || '').toLowerCase();
  const isNew = name.startsWith('new') || name === '';
  if (!isNew) return;

  const gearTypes = [
    { value: 'firearm', label: game.i18n.localize("CONTINUUM.GearTypes.Firearm"), icon: 'fa-crosshairs' },
    { value: 'technology', label: game.i18n.localize("CONTINUUM.GearTypes.Technology"), icon: 'fa-microchip' },
    { value: 'tool', label: game.i18n.localize("CONTINUUM.GearTypes.Tool"), icon: 'fa-wrench' },
    { value: 'vehicle', label: game.i18n.localize("CONTINUUM.GearTypes.Vehicle"), icon: 'fa-car' }
  ];

  const buttons = {};
  for (const gt of gearTypes) {
    buttons[gt.value] = {
      label: gt.label,
      icon: `<i class="fas ${gt.icon}"></i>`,
      callback: async () => {
        const update = { 'system.gearType': gt.value };
        if (gt.value === 'vehicle') {
          update['system.vehicleClass'] = 'land';
        }
        await item.update(update);
      }
    };
  }

  new Dialog({
    eventTitle: game.i18n.localize("CONTINUUM.Dialogs.SelectGearType"),
    content: '<p>' + game.i18n.localize("CONTINUUM.GearTypes.GearTypeQuestion") + '</p>',
    buttons,
    default: 'technology'
  }, { top: Math.min(window.innerHeight - 200, 200), left: Math.min(window.innerWidth - 300, 300) }).render(true);
});

Hooks.once('ready', () => {
  initCombatSocket();
  runLifelineAudit();
  _migrateAgesToEras();
  _migrateAttributeRename();
});

/*
One-time migration: rename system.ages to system.eras on all character actors.
Runs only when system.ages exists and system.eras does not. GM only.
*/
async function _migrateAgesToEras() {
  if (!game.user?.isGM) return;
  const actors = (game.actors?.contents ?? []).filter(a => a.type === 'character');
  for (const actor of actors) {
    if (!actor.system.ages || Object.keys(actor.system.ages).length === 0) continue;
    if (actor.system.eras && Object.keys(actor.system.eras).length > 0) continue;
    const updates = { 'system.eras': actor.system.ages };
    for (const ageId of Object.keys(actor.system.ages)) {
      updates[`system.ages.-=${ageId}`] = null;
    }
    await actor.update(updates);

  }
}

/*
One-time migration: rename attribute keys from body/mind/eq/quick to force/analyze/relate/react.
Runs only when old keys exist and new keys do not. GM only.
*/
async function _migrateAttributeRename() {
  if (!game.user?.isGM) return;
  migrateAttributeRename();
}
