# Publishing Readiness Guide: Continuum V2

Step-by-step plan to transform the Continuum V2 system from a development project into a polished, paid Foundry VTT system package.

---

## Phase 1: Purge Development Artifacts (Target: -220 MB)

### Step 1.1: Delete the `reference OLD` directory (107 MB)

This is an entire duplicate of a previous codebase version. It has no import references from the active code.

```
Remove-Item -Recurse -Force "reference OLD"
```

Path: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\reference OLD`

### Step 1.2: Delete dev screenshots from assets (~15 MB)

These are personal development screenshots with spaces in filenames, never referenced in CSS or templates.

```
Remove-Item "assets\Screenshot 2026-03-17 120747.png"
Remove-Item "assets\Screenshot 2026-03-17 121610.png"
Remove-Item "assets\Screenshot 2026-03-17 122010.png"
Remove-Item "assets\Screenshot 2026-03-17 122116.png"
Remove-Item "assets\Screenshot 2026-03-17 160619.png"
Remove-Item "assets\Screenshot 2026-03-23 163307.png"
Remove-Item "assets\Screenshot 2026-03-23 171056.png"
Remove-Item "assets\Screenshot 2026-03-23 174337.png"
Remove-Item "assets\Screenshot 2026-03-23 175846.png"
Remove-Item "assets\Screenshot 2026-03-25 201822.png"
Remove-Item "assets\Screenshot 2026-03-25 202458.png"
Remove-Item "assets\Screenshot 2026-03-26 184604.png"
Remove-Item "assets\Screenshot 2026-03-26 185555.png"
Remove-Item "assets\Screenshot 2026-03-28 195306.png"
Remove-Item "assets\Screenshot 2026-04-07 152226.png"
Remove-Item "assets\Screenshot 2026-04-07 154301.png"
Remove-Item "assets\Screenshot 2026-04-08 032756.png"
Remove-Item "assets\Screenshot 2026-04-08 054413.png"
Remove-Item "assets\Screenshot 2026-04-08 080647.png"
Remove-Item "assets\Screenshot 2026-04-20 163626.png"
Remove-Item "assets\Screenshot 2026-04-20 165000.png"
```

All paths under: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\assets\`

### Step 1.3: Delete the `screenshots` directory (~4 MB)

Development screenshots not referenced by any production code.

```
Remove-Item -Recurse -Force "screenshots"
```

Path: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\screenshots`

### Step 1.4: Delete test NPC portraits (~25 MB)

These are AI-generated test artifacts, not distribution assets. The NPC generator creates portraits at runtime and stores them on Foundry tokens, so these seed files are not needed.

```
Remove-Item -Recurse -Force "portraits"
```

Wait - check if any template or JS references `portraits/` before deleting. If the NPC generator writes here, create an empty `portraits/.gitkeep` instead.

Path: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\portraits`

### Step 1.5: Delete the `coverage` directory (test artifacts)

```
Remove-Item -Recurse -Force "coverage"
```

Path: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\coverage`

### Step 1.6: Delete AI-generated asset files with problematic names

These have ChatGPT attribution in filenames and are unused or duplicative:

```
Remove-Item "assets\ChatGPT Image Apr 1, 2026, 07_46_23 PM.png"
Remove-Item "assets\ChatGPT Image Jul 13, 2025, 06_50_53 PM.png"
Remove-Item "assets\ChatGPT Image Jul 13, 2025, 06_51_35 PM.png"
Remove-Item "assets\metability-spinner - Copy.png"
Remove-Item "assets\Caleb Throrne.png"
```

All paths under: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\assets\`

### Step 1.7: Consolidate duplicate Fraternity images

The `Fraternities/` directory has two naming schemes for the same images. Keep one set, delete the other.

**Keep these** (short simple names, no "Fraternities-" prefix):
- `assets\Fraternities\Antequarians.jpg`
- `assets\Fraternities\Engineers.jpg`
- `assets\Fraternities\Foxhorn.jpg`
- `assets\Fraternities\Midwives.jpg`
- `assets\Fraternities\Moneychangers.jpg`
- `assets\Fraternities\Physicians.jpg`
- `assets\Fraternities\Quicker.jpg`
- `assets\Fraternities\Scribes.jpg`
- `assets\Fraternities\Thespians.jpg`

**Delete these** (duplicate with "Fraternities-" prefix):
```
Remove-Item "assets\Fraternities\Fraternities-Antequarians.jpg"
Remove-Item "assets\Fraternities\Fraternities-Dreamers.jpg"
Remove-Item "assets\Fraternities\Fraternities-Engineers.jpg"
Remove-Item "assets\Fraternities\Fraternities-Foxhorn.jpg"
Remove-Item "assets\Fraternities\Fraternities-Midwives.jpg"
Remove-Item "assets\Fraternities\Fraternities-Physicians.jpg"
Remove-Item "assets\Fraternities\Fraternities-Physicians white.jpg"
Remove-Item "assets\Fraternities\Fraternities-Quicker.jpg"
Remove-Item "assets\Fraternities\Fraternities-Scribes.jpg"
Remove-Item "assets\Fraternities\Fraternities-Thesbians.jpg"
```

Also delete (not in the short-name set, likely unused):
```
Remove-Item "assets\Fraternities\Midwives_NOT.jpg"
```

Before deleting, search all `.js`, `.html`, `.css`, `.hbs` files for any references to "Fraternities-" prefixed filenames and update those references to use the short names.

### Step 1.8: Convert PNG assets to JPG where appropriate

Era images are a mix of PNG and JPG. Convert the PNGs to JPG (photos should be JPG, not PNG). Fix the `EraScropoid` typo to `EraScorpioid` while you are at it.

**Convert PNG to JPG** (Era images are photographs/artwork):
- `assets\Eras\EraAquarian.png` -> `assets\Eras\EraAquarian.jpg`
- `assets\Eras\EraAriesian.png` -> `assets\Eras\EraAriesian.jpg`
- `assets\Eras\EraCanerean.png` -> `assets\Eras\EraCanerean.jpg`
- `assets\Eras\EraCapricornic.png` -> `assets\Eras\EraCapricornic.jpg`
- `assets\Eras\EraGeminid.png` -> `assets\Eras\EraGeminid.jpg`
- `assets\Eras\EraLeonid.png` -> `assets\Eras\EraLeonid.jpg`
- `assets\Eras\EraLibran.png` -> `assets\Eras\EraLibran.jpg`
- `assets\Eras\EraPiscean.png` -> `assets\Eras\EraPiscean.jpg` (also has `Era_Piscean.jpg` - deduplicate)
- `assets\Eras\EraSagittarian.png` -> `assets\Eras\EraSagittarian.jpg`
- `assets\Eras\EraScropoid.png` -> `assets\Eras\EraScorpioid.jpg` (fix typo)
- `assets\Eras\EraTauran.png` -> `assets\Eras\EraTauran.jpg`
- `assets\Eras\EraVirgin.png` -> `assets\Eras\EraVirgin.jpg`

**Also convert these PNG assets to JPG** (UI artwork, not needing transparency):
- `assets\ChrSheetBG-02.png` -> `assets\ChrSheetBG-02.jpg`
- `assets\Continuum_Hit_Diagram_v2.png` -> `assets\Continuum_Hit_Diagram_v2.jpg`
- `assets\hit-location.png` -> `assets\hit-location.jpg`
- `assets\vehicle-speed-slider.png` -> `assets\vehicle-speed-slider.jpg`
- `assets\Dice Roller Bonus Slider.png` -> `assets\dice-roller-bonus-slider.jpg` (fix name)
- `assets\Operant Potentials sample-01.png` -> `assets\operant-potentials-sample-01.jpg` (fix name)

**Keep as PNG** (these are UI sprites that may need transparency):
- `assets\metability-potential-spinner.png`
- `assets\metability-push-pointer.png`
- `assets\metability-push-slider.png`
- `assets\metability-spinner.png`

After converting, search all `.js`, `.html`, `.css`, `.hbs` files for the old `.png` filenames and update to `.jpg`.

### Step 1.9: Delete `Era_Piscean.jpg` (duplicate of `EraPiscean`)

After converting `EraPiscean.png` to `EraPiscean.jpg`, delete the underscore version:
```
Remove-Item "assets\Eras\Era_Piscean.jpg"
```

### Step 1.10: Add `.gitignore` entries to prevent regression

Add these to `.gitignore`:
```
coverage/
portraits/npc_*.png
screenshots/
reference OLD/
assets/ChatGPT*
assets/Screenshot*
```

### Step 1.11: Delete `conductor/` and internal planning docs (not for distribution)

These are development tracking files that should not ship in the paid package. They reference AI code generation workflow and internal planning.

Files/directories to remove from the distribution package:
- `conductor/` (entire directory, 0.2 MB)
- `AGENTS.md`
- `FILELIST.md`
- `REBUILD_MANDATE.md`
- `UI_UX_GUIDE.md`
- `Implementation Proposal The Temporal Translation Layer.txt`
- `ImplGuide.md`
- `FeatureGuide.md`
- `Continuum-v2_featuresList.txt`
- `RemoteVPS-And-Setup.txt`
- `references.txt`
- `SUBAGENT_SETUP_GUIDE.md`
- `console/` (entire directory)
- `.opencode/` (if present)

These can stay in the git repo but should be excluded from the Foundry package distribution.

---

## Phase 2: Internationalization (i18n)

### Step 2.1: Create the `lang/` directory and `en.json`

Create: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\lang\en.json`

Structure:
```json
{
  "CONTINUUM": {
    "SystemName": "Continuum: Roleplaying in the Yet",
    "SheetLabels": {
      "Character": "Character Sheet",
      "Organization": "Organization Sheet",
      "Location": "Location Sheet"
    },
    "Tabs": {
      "Main": "Main",
      "Personal": "Personal",
      "Attributes": "Attributes",
      "Background": "Background",
      "Spanning": "Spanning",
      "Metabilities": "Metabilities",
      "TheYet": "The Yet",
      "Goals": "Goals",
      "Experiences": "Experiences",
      "Combat": "Combat",
      "Favors": "Favors",
      "Relationships": "Relationships",
      "Gear": "Gear",
      "Vehicles": "Vehicles"
    },
    "Attributes": {
      "Body": "Force",
      "Mind": "Analyze",
      "EQ": "Relate",
      "Quick": "React",
      "Willpower": "Willpower",
      "Temp": "Temp",
      "Perm": "Perm"
    },
    "Spanning": {
      "Span": "Span",
      "NaturalSpan": "Natural Span",
      "DeliberateFrag": "Deliberate Frag",
      "NaturalFrag": "Natural Frag",
      "Pulled": "Pulled"
    },
    "Combat": {
      "RangedWeapons": "Ranged Weapons",
      "MeleeWeapons": "Melee Weapons",
      "Armor": "Armor",
      "Wounds": "Wounds",
      "IP": "IP",
      "Bleeding": "Bleeding",
      "ActionPoints": "Action Points"
    },
    "Eras": {
      "Era": "Era",
      "DateFrom": "Date From",
      "DateTo": "Date To"
    },
    "Dialogs": {
      "LogEvent": "Log Event",
      "LogSpan": "Log Span",
      "EditEra": "Edit Era",
      "EditExperience": "Edit Experience",
      "SelectGearType": "Select Gear Type",
      "CreateEra": "Create Era",
      "ScheduleYet": "Schedule Yet"
    },
    "Errors": {
      "SpanGraphFailed": "Span graph initialization failed",
      "GeocodeFailed": "Geocoding failed for location",
      "YetNotFound": "Yet event not found",
      "RecordNotFound": "Record not found for deletion"
    },
    "Tooltips": {
      "SubjectiveAge": "Subjective age in years",
      "ObjectiveDate": "Objective calendar date"
    }
  }
}
```

### Step 2.2: Register `en.json` in `system.json`

In `system.json`, add:
```json
"languages": [
  {
    "lang": "en",
    "name": "English",
    "path": "lang/en.json"
  }
]
```

### Step 2.3: Replace hardcoded strings in templates and JS

This is the big one. Every user-facing string must be replaced with `{{localize "CONTINUUM.Tabs.Personal"}}` in templates and `game.i18n.localize("CONTINUUM.Tabs.Personal")` in JavaScript.

**Template files requiring i18n pass** (each needs full string audit):
- `templates\actor-sheet.html`
- `templates\organization-sheet.html`
- `templates\location-sheet.html`
- `templates\chat-roll.html`
- `templates\chat-org-attack.html`
- `templates\dialog-roll.html`
- `templates\dialogs\event-node-editor.html`
- `templates\dialogs\span-result-dialog.html`
- `templates\dialogs\npc-importer.html`
- `templates\foundry-vtt-map-ux.html`
- `templates\items\item-ability-sheet.html`
- `templates\items\item-artifact-sheet.html`
- `templates\items\item-gear-sheet.html`
- `templates\npc-generator\*.html`
- `templates\sections\*.html` (all 25 section templates)
- `templates\sections\npc-combat-card.html`
- `templates\apps\all-lifelines.html`

**JS files with user-facing strings** (most critical ones):
- `modules\sheet-hooks.js` - dialog titles, button labels (lines 60-99)
- `continuum.js` - form labels
- `system-api.js` - roll flavor text (lines 47-49, 82)
- `modules\sheet-hooks.js` - gear type dialog (lines 160-188), settings labels (lines 60-99)
- All dialog files in `modules\span-graph\interaction\`, `modules\lifeline\services\ui\`

### Step 2.4: Add missing `background` field to `system.json`

Add a background image for the Foundry system setup screen. Create a 1920x600 or similar banner and reference it:

```json
"background": "systems/continuum-v2/assets/system-banner.jpg"
```

---

## Phase 3: `system.json` Metadata Overhaul

### Step 3.1: Update `system.json`

Current file: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\system.json`

Replace the entire file with proper metadata:

```json
{
  "id": "continuum-v2",
  "title": "Continuum: Roleplaying in the Yet",
  "description": "A time-travel RPG system for Foundry VTT. Track characters across nonlinear timelines with the Span Graph, manage eras and experiences, calculate spanning physics, and navigate the paradoxes of the Continuum.",
  "version": "1.0.0",
  "author": "Your Name Here",
  "authors": [
    {
      "name": "Your Name Here",
      "url": "https://your-website.com",
      "discord": "your-discord-handle"
    }
  ],
  "url": "https://your-website.com/continuum-v2",
  "manifest": "https://your-website.com/continuum-v2/system.json",
  "changelog": "https://your-website.com/continuum-v2/changelog.md",
  "bugs": "https://github.com/your-org/continuum-v2/issues",
  "readme": "https://your-website.com/continuum-v2/README.md",
  "socket": true,
  "esmodules": [
    "continuum.js",
    "organization-sheet.js",
    "location-sheet.js",
    "item-sheet.js",
    "modules/sheet-hooks.js",
    "system-api.js",
    "continuum-drag-drop.js",
    "modules/network/handle-actor-drop.js",
    "modules/spacetime-bridge/index.js",
    "modules/npc-generator/index.js"
  ],
  "styles": [
    "styles/variables.css",
    "styles/base.css",
    "styles/backgrounds.css",
    "styles/personal.css",
    "styles/attributes.css",
    "styles/dialogs.css",
    "styles/metabilities.css",
    "styles/spanning.css",
    "styles/goals.css",
    "styles/experiences.css",
    "styles/combat-ranged-weapons.css",
    "styles/combat-melee-weapons.css",
    "styles/combat-armor.css",
    "styles/combat-wounds.css",
    "styles/npc-combat-card.css",
    "styles/lists.css",
    "styles/vehicles.css",
    "styles/span_graph.css",
    "styles/span_graph_layout.css",
    "styles/span_graph_elements.css",
    "styles/span_graph_nodes_paths.css",
    "styles/spreadsheet.css",
    "styles/gear.css",
    "styles/organization.css",
    "styles/org-structure.css",
    "styles/org-attributes.css",
    "styles/org-mandates.css",
    "styles/org-methods.css",
    "styles/org-conflict.css",
    "styles/org-balance-sheet.css",
    "styles/location.css",
    "styles/chat-roll.css",
    "styles/npc-wizard.css"
  ],
  "actorTypes": ["character", "organization", "location"],
  "itemTypes": ["artifact", "ability", "gear"],
  "languages": [
    {
      "lang": "en",
      "name": "English",
      "path": "lang/en.json"
    }
  ],
  "compatibility": {
    "minimum": "13",
    "verified": "13"
  },
  "templateVersion": 3,
  " packs": [],
  "license": "YOUR_LICENSE_URL"
}
```

Key changes:
- `title` - Proper game name
- `description` - Actual marketing description
- `authors` - Array format with your info
- `url`, `manifest`, `changelog`, `bugs`, `readme` - All required for Foundry package repo
- `languages` - Add the i18n path
- `license` - Change from MIT (if selling, you need a proper license URL or remove this if it's not open source)
- `background` - Add system banner image

---

## Phase 4: Data Migration Framework

### Step 4.1: Create a migration system

Create: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\migration\migrations.js`

```javascript
// Migration framework for schema version upgrades.
// Each migration function receives the world data and returns updated data.
// Migrations run on the 'ready' hook, after Foundry loads all actors.

export const MIGRATIONS = {
  2: migrateV1ToV2,
  3: migrateV2ToV3,
  // Add new migrations here as templateVersion increments
};

export async function runMigrations() {
  const currentVersion = game.settings.get('continuum-v2', 'schemaVersion') || 1;
  const targetVersion = game.system.templateVersion;

  if (currentVersion >= targetVersion) return;

  ui.notifications.info(
    `Continuum V2: Migrating data from schema v${currentVersion} to v${targetVersion}...`
  );

  for (let v = currentVersion + 1; v <= targetVersion; v++) {
    const migrate = MIGRATIONS[v];
    if (migrate) await migrate();
  }

  await game.settings.set('continuum-v2', 'schemaVersion', targetVersion);
  ui.notifications.info('Continuum V2: Migration complete.');
}
```

### Step 4.2: Register migration setting in `sheet-hooks.js`

In `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\sheet-hooks.js`, add inside the `Hooks.once('init')` block:

```javascript
game.settings.register('continuum-v2', 'schemaVersion', {
  name: 'Schema Version',
  scope: 'world',
  config: false,
  type: Number,
  default: 1
});
```

### Step 4.3: Move the existing migration into the framework

The current `_migrateAgesToEras()` function in `sheet-hooks.js` (lines 200-213) should be moved into `modules/migration/migrations.js` as `migrateV2ToV3`.

### Step 4.4: Replace the `Hooks.once('ready')` call

In `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\sheet-hooks.js`, replace:
```javascript
Hooks.once('ready', () => {
  initCombatSocket();
  runLifelineAudit();
  _migrateAgesToEras();
});
```

With:
```javascript
Hooks.once('ready', async () => {
  initCombatSocket();
  runLifelineAudit();
  await runMigrations();
});
```

---

## Phase 5: Accessibility

### Step 5.1: Add ARIA labels to the character sheet template

File: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\templates\actor-sheet.html`

Add `role="tablist"` to tab navigation, `role="tabpanel"` to tab content sections, `aria-label` on all tab buttons, `aria-labelledby` on tab panels.

### Step 5.2: Add keyboard navigation to the span graph

Files:
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\span-graph\interaction\pointer-machine.js`
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\span-graph\interaction\ghost-snap.js`
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\templates\sections\span_graph.html`

Add `tabindex="0"` to the SVG container and `aria-label="Character Lifeline Span Graph"` to the main SVG element. Add keyboard event handlers for arrow keys (pan), +/- (zoom), Enter/Space (select node).

### Step 5.3: Fix `outline: none` in CSS

Every `outline: none` must be paired with a visible focus indicator. Search all CSS files and replace:

```css
outline: none;
```

With:

```css
outline: none;
/* Visible focus ring added for accessibility */
```

And add a corresponding `:focus-visible` rule with a visible outline (e.g., `box-shadow: 0 0 0 2px #4da6ff`).

Files with `outline: none`:
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\styles\gear.css` (lines 337-340, 561-563, 722-724)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\styles\spreadsheet.css` (line 17)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\styles\organization.css` (lines 477, 569-571, 601, 657-658)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\styles\attributes.css` (line 62)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\styles\timelines.css` (lines 222-223)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\styles\npc-wizard.css` (lines 110-114)

### Step 5.4: Add screen reader text to important UI elements

Add `class="sr-only"` utility class to `styles/base.css`:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## Phase 6: Debug Cleanup

### Step 6.1: Remove or gate all `console.debug()` calls

Every `console.debug()` in production code should be removed or gated behind a debug setting.

**Files with `console.debug()` calls:**
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\spacetime-bridge\location-markers.js` (line 181)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\spacetime-bridge\ensure-proxy-tokens.js` (lines 100, 121)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\spacetime-bridge\write-keyframes.js` (lines 34, 55, 64, 104)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\spacetime-bridge\startup-geocode.js` (lines 138, 142, 164)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\spacetime-bridge\render-overlay.js` (line 140)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\state\update-history-row.js` (line 145)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\state\insert-history-row.js` (line 116)

### Step 6.2: Review all `console.warn()` calls

Keep only those that are genuinely useful to GMs troubleshooting. Wrap in a debug flag check:

```javascript
if (game.settings.get('continuum-v2', 'debugMode')) {
  console.warn('[INSERT-HANDSHAKE] TTL drifted ts:', ...);
}
```

**Files with `console.warn()` calls:**
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\state\update-history-row.js` (lines 49, 54)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\state\insert-history-row.js` (lines 48, 53)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\state\delete-history-row.js` (line 35)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\state\mark-yet-fulfilled.js` (lines 12, 18)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\temporal-kernel\verify-span-coordinates.js` (line 32)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\lifeline\services\ui\span-dialog\get-template-data.js` (line 37)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\lifeline\services\chronology-assembler.js` (line 45)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\lifeline\spreadsheet\submit-spreadsheet-row.js` (line 25)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\lifeline\spreadsheet\bulk-actions.js` (line 75)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\lifeline\services\ui\event-dialog\handle-submit\reconcile-spacetime-debt.js` (line 53)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\lifeline\services\lifeline-audit.js` (line 76)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\span-graph\renderers\node-renderer.js` (line 25)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\span-graph\interaction\pointer-machine.js` (lines 396, 619)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\temporal-engine\commands\fulfill-yet.js` (lines 31, 36)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\span-graph\interaction\yet-fulfillment.js` (line 20)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\npc-generator\npc-lifeline-builder.js` (line 400)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\sheet-item-handlers.js` (line 189)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\npc-generator\npc-geocoder.js` (lines 30, 33, 45)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\spacetime-bridge\batch-geocode.js` (line 93)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\state\geocode-service.js` (line 137)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\lifeline\services\node-location-master.js` (line 17)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\organization\org-dialog-edit-encounter.js` (line 121)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\span-graph-dialogs-edit.js` (line 45)

### Step 6.3: Add a `debugMode` setting

In `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\sheet-hooks.js`, add:

```javascript
game.settings.register('continuum-v2', 'debugMode', {
  name: 'CONTINUUM.Settings.DebugMode',
  hint: 'CONTINUUM.Settings.DebugModeHint',
  scope: 'world',
  config: true,
  type: Boolean,
  default: false
});
```

### Step 6.4: Remove the `TODO` comment

File: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\lifeline\spreadsheet\csv-tools.js` line 82:
```javascript
// TODO: Batch update actor data in Phase 3
```

Either implement or remove.

### Step 6.5: Remove `console.error()` calls that are developer-facing

**Files with `console.error()`:**
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\character\activate-listeners.js` (line 261)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\map-manager.js` (line 94)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\spacetime-bridge\index.js` (line 30)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\spacetime-bridge\render-overlay.js` (line 133)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\spacetime-bridge\assign-token-location.js` (lines 259, 271)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\lifeline\spreadsheet\submit-spreadsheet-row.js` (line 232)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\organization\org-map.js` (line 457)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\sheet-listeners.js` (line 152)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\lifeline\events\pointer-up-handler\handle-yet-drop.js` (line 45)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\lifeline\events\pointer-up-handler\handle-age-creation.js` (line 11)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\npc-generator\npc-wizard-app.js` (lines 257, 284, 335, 382)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\npc-generator\npc-image-client.js` (lines 53, 58)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\organization\org-network-graph.js` (line 14)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\lifeline\services\map\report-api-error.js` (line 8)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\network\handle-actor-drop.js` (line 28)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\temporal-translator\coordinate-converter.js` (line 53)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\span-graph-dialogs-edit.js` (lines 24, 33, 45, 60)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\lifeline\events\pointer-up-handler\handle-yet-creation.js` (line 15)

Replace `console.error()` with `ui.notifications.error()` for user-facing errors, or gate behind `debugMode` for developer-facing errors.

### Step 6.6: Remove or gate the lifeline audit on startup

File: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\sheet-hooks.js` line 192:
```javascript
runLifelineAudit();
```

This runs on every `ready` hook. It should be gated behind `debugMode`:
```javascript
if (game.settings.get('continuum-v2', 'debugMode')) runLifelineAudit();
```

---

## Phase 7: Combat Tracker Integration

### Step 7.1: Remove external combat-tracker module dependency

The system currently emits to `module.continuum-combat-tracker` socket and calls `window.CCW_setAPByActor`. This needs to become a native system feature.

**Files to modify:**
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\system-api.js` (lines 72, 76-82, 105-108)

Current code in `system-api.js`:
```javascript
if (window.CCW_setAPByActor) window.CCW_setAPByActor(actor.id, actionPoints);
// ...
game.socket.emit('module.continuum-combat-tracker', { ... });
// ...
const cctModule = game.modules.get('continuum-combat-tracker');
if (cctModule?.api?.getConsole) return cctModule.api.getConsole();
if (window.ContinuumCombat?.getConsole) return window.ContinuumCombat.getConsole();
```

### Step 7.2: Create a built-in combat tracker

Create the following new files:

- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\combat\combat-tracker.js` - Foundry CombatTracker subclass with Continuum-specific AP display
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\combat\combat-tracker-app.js` - GM Console application (the thing `getCombatConsole()` returns)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\combat\combat-tracker-socket.js` - System-level socket for combat sync (replaces `module.continuum-combat-tracker`)
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\templates\combat\combat-tracker.html` - Tracker UI template
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\styles\combat-tracker.css` - Tracker styles

### Step 7.3: Register the combat tracker in `sheet-hooks.js`

In `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\sheet-hooks.js`, add inside `Hooks.once('init')`:

```javascript
import { ContinuumCombatTracker } from './modules/combat/combat-tracker.js';
CONFIG.Combat.sheetClass = ContinuumCombatTracker;
```

And in `Hooks.once('ready')`, replace `initCombatSocket()` with the new system socket.

### Step 7.4: Add `esmodules` entry (if separate) or fold into existing

If the combat tracker needs its own entry point, add to `system.json` `esmodules`:
```json
"modules/combat/combat-tracker.js"
```

Otherwise, import it from `sheet-hooks.js`.

### Step 7.5: Create compendium pack for combat

Add to `system.json`:
```json
"packs": [
  {
    "name": "combat-reference",
    "label": "Combat Reference",
    "path": "packs/combat-reference",
    "type": "JournalEntry",
    "system": "continuum-v2"
  }
]
```

---

## Phase 8: Organization Module Breakout

This section describes how to extract the Organization actor type, its sheet, and related modules into a standalone Foundry module (`continuum-orgs`) to be sold as an expansion pack.

### Step 8.1: Create the expansion module repository

Create a new repository: `continuum-orgs`

Structure:
```
continuum-orgs/
  module.json
  continuum-orgs.js
  styles/
    organization.css
    org-structure.css
    org-attributes.css
    org-mandates.css
    org-methods.css
    org-conflict.css
    org-balance-sheet.css
  templates/
    organization-sheet.html
    sections/
      org-structure.html
      org-attributes.html
      org-mandates.html
      org-methods.html
      org-conflict.html
      org-balance-sheet.html
      org-graph.html
      org-network.html
  modules/
    organization/
      (all 55 org-*.js files)
    org-economics/
      (all economy files)
  lang/
    en.json
  packs/
    (org example packs)
```

### Step 8.2: Files to move to `continuum-orgs`

**JS module files** (all under `modules/organization/`):
```
modules/organization/org-sheet-handlers-map.js
modules/organization/org-map.js
modules/organization/org-interactions-pointer-up.js
modules/organization/org-interactions-pointer-move.js
modules/organization/org-interactions-pointer-down.js
modules/organization/org-interactions-keyboard.js
modules/organization/org-interactions-hover.js
modules/organization/org-interactions-drag.js
modules/organization/org-interactions.js
modules/organization/org-data.js
modules/organization/org-render-grid.js
modules/organization/org-render-axis.js
modules/organization/org-render.js
modules/organization/org-render-unit-selector.js
modules/organization/org-render-unit-heads.js
modules/organization/org-render-subway.js
modules/organization/org-render-phases.js
modules/organization/org-render-operations.js
modules/organization/org-render-drag-line.js
modules/organization/org-dialog-phase.js
modules/organization/org-dialog-experience.js
modules/organization/org-dialog-edit.js
modules/organization/org-dialog-engagement.js
modules/organization/org-dialog-insert-encounter.js
modules/organization/org-dialog-edit-encounter.js
modules/organization/org-dialog-log.js
modules/organization/org-dialog-yet.js
modules/organization/org-dialog-unit-settings.js
modules/organization/org-dialog-resolve.js
modules/organization/org-dialog-create-mandate.js
modules/organization/org-dialog-helpers.js
modules/organization/org-graph-dialogs.js
modules/organization/org-graph-interactions-mandates.js
modules/organization/org-graph.js
modules/organization/org-graph-logic.js
modules/organization/org-graph/org-graph-logic.js
modules/organization/org-network-graph.js
modules/organization/org-network-data.js
modules/organization/org-network-interactions.js
modules/organization/org-network-render.js
modules/organization/org-network-timeline.js
modules/organization/org-activate-listeners.js
modules/organization/org-operational-lifeline.js
modules/organization/org-prepare-data.js
modules/organization/org-event-add.js
modules/organization/org-item-add.js
modules/organization/org-item-delete.js
modules/organization/org-handle-situation.js
modules/organization/org-handle-settings.js
modules/organization/org-handle-toggle.js
modules/organization/org-economics/economic-registry.js
modules/organization/org-economics/calculate-unit-costs.js
modules/organization/org-economics/calculate-attribute-cost.js
modules/organization/org-economics/get-economic-report.js
modules/organization/org-economics/get-curve-type.js
modules/organization/org-economics/validate-budget-maintenance.js
```

**Top-level sheet file:**
```
organization-sheet.js
```

**CSS files:**
```
styles/organization.css
styles/org-structure.css
styles/org-attributes.css
styles/org-mandates.css
styles/org-methods.css
styles/org-conflict.css
styles/org-balance-sheet.css
```

**Templates:**
```
templates/organization-sheet.html
templates/sections/org-structure.html
templates/sections/org-attributes.html
templates/sections/org-mandates.html
templates/sections/org-methods.html
templates/sections/org-conflict.html
templates/sections/org-balance-sheet.html
templates/sections/org-graph.html
templates/sections/org-network.html
templates/chat-org-attack.html
```

### Step 8.3: Remove organization from core `system.json`

Remove `"organization"` from `actorTypes` array, remove organization CSS entries from `styles`, remove `organization-sheet.js` from `esmodules`.

### Step 8.4: Remove organization from `template.json`

Remove the `"organization"` block from `template.json` Actor types. The expansion module will register it via `module.json`.

### Step 8.5: Handle shared dependencies

The organization module imports from these core modules. The expansion module needs to declare a dependency on the core system:

- `modules/network/handle-actor-drop.js` - used by both character and org sheets
- `modules/combat/combat-socket.js`, `defender-profile.js`, `mitigation-engine.js` - org combat uses these
- `modules/state/` modules - org data storage uses these
- `modules/temporal-kernel/` physics modules - org lifeline uses these
- `item-data.js` and `item-sheet.js` - org items reference these

In `module.json` for the expansion:
```json
{
  "id": "continuum-orgs",
  "title": "Continuum: Organizations & Vehicle Combat",
  "relationships": {
    "systems": [
      {
        "id": "continuum-v2",
        "type": "system",
        "compatibility": { "minimum": "1.0.0" }
      }
    ]
  }
}
```

### Step 8.6: Prompt for Org Breakout

> **Task**: Extract the Organization actor type from the Continuum V2 core system into a standalone Foundry VTT module called `continuum-orgs`.
>
> **Scope**:
> 1. Create a new module repository `continuum-orgs` with proper `module.json` declaring a system dependency on `continuum-v2` >= 1.0.0
> 2. Move all 55 `modules/organization/org-*.js` files, plus `organization-sheet.js`, all org CSS files (7 files), and all org templates (10 files) into the new module
> 3. Move the `"organization"` actor type definition from `template.json` into the module's own template definition
> 4. Update all import paths within the moved files (they currently import from `./modules/...` - these need to resolve to the core system's exports via `game.system.api` or foundry.utils)
> 5. Expose necessary kernel/state functions from the core system via `system-api.js` so the expansion can call them
> 6. Remove `"organization"` from `system.json` actorTypes and esmodules/styles arrays
> 7. Remove the org CSS entries from `system.json` styles array
> 8. Add the `"organization"` actor type registration to the module's init hook so it registers alongside the core system
> 9. Verify that the `handleActorDrop` import still works (it lives in core but is called from the org sheet)
> 10. The org module should register as a separate Foundry module that extends the core system, not conflict with it
>
> **Critical**: Ensure that when the org module is NOT installed, the core character sheet continues working perfectly. When the org module IS installed, the Organization actor type appears in Foundry's actor creation menu with its full sheet, graph, and economics.

---

## Phase 9: Documentation & Compendium Packs

### Step 9.1: Write a README.md

Create: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\README.md`

Must include:
- **System Overview**: What Continuum is, what makes it unique (time-travel RPG with nonlinear lifeline tracking)
- **Installation**: How to install in Foundry VTT
- **Quick Start**: Step-by-step for creating your first character
- **Features**: List with screenshots (the span graph, the spreadsheet, the timeline)
- **Actor Types**: Character, Location (note: Organization is an expansion)
- **Item Types**: Artifact, Ability, Gear
- **Configuration**: Google Maps API key setup, AI provider settings
- **Keyboard Shortcuts**: Pan (arrow keys), Zoom (+/-), Select (Enter/Space)
- **Troubleshooting**: Common issues
- **License**: Your chosen license

### Step 9.2: Write a CHANGELOG.md

Create: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\CHANGELOG.md`

```markdown
# Changelog

## v1.0.0 - Initial Release

### Added
- Character sheet with spanning, attributes, metabilities, combat, eras, experiences, The Yet
- Span Graph visualization with pan/zoom/interaction
- Lifeline spreadsheet with CSV import/export
- Organization actor type (expansion pack)
- Location actor type with map integration
- NPC Generator (Gemini/OpenRouter)
- Temporal Engine with physics-accurate spanning calculation
- The Forgetting opacity fade for experiences
- Era management with structural refinement
- Historical span insertion with downstream propagation
- Pulled span support (passenger spanning)

### Known Issues
- The Yet and Spanning Core Physics tracks are in-progress
- Space-Time Map Integration is planned but not started
- Era Navigation & Drag Bar is planned but not started
```

### Step 9.3: Create compendium packs

Add to `system.json`:
```json
"packs": [
  {
    "name": "rules-reference",
    "label": "Rules Reference",
    "path": "packs/rules-reference",
    "type": "JournalEntry",
    "system": "continuum-v2"
  },
  {
    "name": "quickstart-guide",
    "label": "Quickstart Guide",
    "path": "packs/quickstart-guide",
    "type": "JournalEntry",
    "system": "continuum-v2"
  },
  {
    "name": "example-characters",
    "label": "Example Characters",
    "path": "packs/example-characters",
    "type": "Actor",
    "system": "continuum-v2"
  },
  {
    "name": "fraternity-reference",
    "label": "Fraternity Reference",
    "path": "packs/fraternity-reference",
    "type": "JournalEntry",
    "system": "continuum-v2"
  },
  {
    "name": "era-reference",
    "label": "Era Reference",
    "path": "packs/era-reference",
    "type": "JournalEntry",
    "system": "continuum-v2"
  }
]
```

Then create these Journal entries in Foundry and export them using `/pack` commands or the compendium UI.

### Step 9.4: Create a system banner image

Create a 1920x600 banner image for the Foundry package listing:
- `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\assets\system-banner.jpg`

This should show the span graph, the character sheet, and the game logo. Use the span graph's dark palette (`#000000` bg, `#00e5ff` level rails, `#ffd700` NOW node, `#ff00ff` spans).

### Step 9.5: Create a thumbnail image

Create a 256x256 or 512x512 thumbnail:
- `C:\Users\USER\Desktop\FoundryData\Data\ystems\continuum-v2\assets\system-thumbnail.png`

---

## Phase 10: Responsive Design & UX Polish

### Step 10.1: Add responsive CSS

Create: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\styles\responsive.css`

```css
@media (max-width: 900px) {
  .continuum-v2.sheet.actor {
    min-width: 600px;
  }
  .continuum-v2 .sheet-body {
    overflow-x: auto;
  }
}

@media (max-width: 700px) {
  .continuum-v2 .tab-buttons {
    flex-wrap: wrap;
  }
  .continuum-v2 .attribute-grid {
    grid-template-columns: 1fr;
  }
}
```

Add to `system.json` styles list.

### Step 10.2: Make span graph responsive

The character sheet has `width: 850, height: 950` hardcoded. Change to:
```javascript
width: Math.min(850, window.innerWidth - 100),
height: Math.min(950, window.innerHeight - 100),
```

File: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\continuum.js` (line 50-51)

---

## Phase 11: Package.json & Build Preparation

### Step 11.1: Update `package.json`

File: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\package.json`

```json
{
  "name": "continuum-v2",
  "version": "1.0.0",
  "description": "Continuum: Roleplaying in the Yet - A time-travel RPG system for Foundry VTT",
  "author": "Your Name Here",
  "license": "YOUR_LICENSE",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "migrate": "node tools/migrate-v1-to-v2.js"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^4.1.4",
    "jsdom": "^27.0.1",
    "vitest": "^4.1.4"
  }
}
```

### Step 11.2: Create a `.gitignore` for distribution

Create/update: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\.gitignore`

Add:
```
node_modules/
coverage/
portraits/npc_*.png
screenshots/
reference OLD/
assets/ChatGPT*
assets/Screenshot*
.opencode/
```

### Step 11.3: Create a distribution exclude list

Create: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\.foundrypackignore`

```
# Development artifacts
conductor/
console/
screenshots/
portraits/
reference OLD/
coverage/
node_modules/
tests/
vitest.config.js
package.json
package-lock.json

# Internal documentation (not for distribution)
AGENTS.md
FILELIST.md
REBUILD_MANDATE.md
UI_UX_GUIDE.md
ImplGuide.md
FeatureGuide.md
SUBAGENT_SETUP_GUIDE.md
Continuum-v2_featuresList.txt
RemoteVPS-And-Setup.txt
references.txt
Implementation Proposal The Temporal Translation Layer.txt
PUBLISHING_GUIDE.md
TRACKS.md
ISSUES.md

# Asset cleanup targets
assets/ChatGPT*
assets/Screenshot*
assets/metability-spinner - Copy.png
assets/Caleb Throrne.png
assets/Fraternities/Fraternities-*
assets/Fraternities/Midwives_NOT.jpg
assets/Eras/Era_Piscean.jpg
```

---

## Phase 12: License & Legal

### Step 12.1: Decide on a license

If selling, `MIT` is too permissive (allows anyone to redistribute). Consider:
- **CC-BY-NC-SA 4.0** - Non-commercial, share-alike (prevents resale)
- **Proprietary EULA** - Full control, standard for paid Foundry systems
- **Dual license** - Open source for code, proprietary for content/assets

Update `system.json` `license` field to point to your LICENSE file URL.

### Step 12.2: Create LICENSE file

Create: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\LICENSE`

Insert your chosen license text.

### Step 12.3: Audit AI-generated content

Files generated by AI tools that may have licensing implications:
- All `npc_*.png` portraits in `portraits/` (AI-generated images)
- `assets/ChatGPT Image*.png` (explicitly ChatGPT-generated)
- `assets/Caleb Throrne.png` (may be AI-generated)
- NPC generator code that calls Gemini/OpenRouter APIs

If selling, you must clear the licensing for AI-generated images with your AI provider's Terms of Service. Many AI tools restrict commercial use of generated images.

---

## Phase 13: Foundry Package Repository Requirements

### Step 13.1: Validate manifest

The Foundry package repo requires:
- `id` matching the repository/directory name
- `title` (not empty)
- `description` (not empty)
- `version` (semver)
- `authors` array (at least one author with name)
- `url` (project URL)
- `manifest` (URL to the system.json for auto-update)
- `changelog` (URL to changelog)
- `bugs` (URL to issue tracker)
- `readme` (URL to README)
- `license` (URL to license)
- `esmodules` or `scripts` (entry points)
- `styles` (CSS entries)
- `languages` array (at least one language)
- `compatibility.minimum` and `compatibility.verified`

### Step 13.2: Set up hosting for auto-update

You need a URL where `system.json` can be fetched for Foundry's auto-update mechanism. Options:
- GitHub Releases
- Your own web server
- Foundry package repository (after approval)

### Step 13.3: Create a release script

Create: `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\tools\release.js`

This script should:
1. Exclude dev files (conductor, screenshots, etc.)
2. Compress images
3. Generate a zip named `continuum-v2-v{version}.zip`
4. Verify `system.json` has all required fields

---

## Implementation Order

Recommended execution order:

1. **Phase 1** (Purge artifacts) - Fastest, biggest impact on package size. ~1 hour.
2. **Phase 6** (Debug cleanup) - Low risk, high polish. ~2 hours.
3. **Phase 3** (system.json metadata) - Required for repo submission. ~30 min.
4. **Phase 4** (Migration framework) - Required for paid release safety. ~2 hours.
5. **Phase 2** (i18n) - Biggest effort, highest value for paid product. ~20-40 hours.
6. **Phase 7** (Combat tracker integration) - Medium effort, required for complete game. ~8-16 hours.
7. **Phase 8** (Org breakout) - Can be done after initial release. ~8-16 hours.
8. **Phase 9** (Documentation & packs) - Required for launch. ~16-24 hours.
9. **Phase 5** (Accessibility) - Important for professional quality. ~8-16 hours.
10. **Phase 10** (Responsive) - Nice to have, not blocking. ~4-8 hours.
11. **Phase 11** (Build prep) - Required before distribution. ~2 hours.
12. **Phase 12** (License) - Required before selling. ~2 hours.
13. **Phase 13** (Foundry repo) - Final step. ~4 hours.

**Estimated total**: 80-130 hours of work across all phases.

---

## Combat Tracker Integration Prompt

> **Task**: Integrate the Continuum Combat Tracker (currently an external Foundry module `continuum-combat-tracker`) into the core Continuum V2 system as a built-in feature.
>
> **Current state**: The system emits combat data via `game.socket.emit('module.continuum-combat-tracker', ...)` in `system-api.js` and calls `window.CCW_setAPByActor`. The external module provides a GM console UI for tracking Action Points per round.
>
> **Requirements**:
> 1. Create `modules/combat/combat-tracker.js` - A Foundry v13 CombatTracker subclass that replaces the socket-based external module. It should: display Action Points per combatant, provide a GM console for AP tracking, and sync AP across connected clients via the system socket (`system.continuum` already defined in `combat-socket.js`).
> 2. Create `modules/combat/combat-tracker-app.js` - The GM combat console application (the `getCombatConsole()` API call should return this).
> 3. Create `modules/combat/combat-tracker-socket.js` - Rewrite the existing `combat-socket.js` to handle AP sync natively instead of the `module.continuum-combat-tracker` channel.
> 4. Create `templates/combat/combat-tracker.html` - Tracker sidebar template.
> 5. Create `styles/combat-tracker.css` - Dark theme matching the Continuum palette.
> 6. Modify `system-api.js` - Remove the `window.CCW_setAPByActor` call (line 72). Change the socket emit from `module.continuum-combat-tracker` to `system.continuum` (line 76). Update `getCombatConsole()` to return the built-in app instead of searching for an external module (lines 105-111).
> 7. Register the combat tracker in `sheet-hooks.js` - Set `CONFIG.Combat.sheetClass` to the new tracker class.
> 8. The existing combat-socket.js already defines `SOCKET_NAME = "system.continuum"` which is the correct channel. Expand it to handle AP broadcasting.
> 9. Ensure the NPC character sheet section `templates/sections/npc-combat-card.html` and the AP rolling workflow in `system-api.js` continue working.
> 10. Add `styles/combat-tracker.css` to `system.json` styles array.
>
> **Key files to modify**:
> - `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\system-api.js`
> - `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\sheet-hooks.js`
> - `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\combat\combat-socket.js`
> - `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\system.json`
>
> **Key files to create**:
> - `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\combat\combat-tracker.js`
> - `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\combat\combat-tracker-app.js`
> - `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\combat\combat-tracker-socket.js`
> - `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\templates\combat\combat-tracker.html`
> - `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\styles\combat-tracker.css`

---

## Organization Breakout Prompt

> **Task**: Extract the Organization actor type from the Continuum V2 core system into a standalone Foundry VTT module called `continuum-orgs`, intended to be sold as an expansion pack alongside the base system.
>
> **Scope**:
> 1. Create a new Foundry module repository `continuum-orgs` with proper `module.json` declaring a system dependency on `continuum-v2` >= 1.0.0
> 2. Move all 55 `modules/organization/org-*.js` files into the new module's `modules/organization/` directory
> 3. Move `organization-sheet.js` into the new module as its entry point
> 4. Move all 7 org CSS files (`organization.css`, `org-structure.css`, `org-attributes.css`, `org-mandates.css`, `org-methods.css`, `org-conflict.css`, `org-balance-sheet.css`) into the new module
> 5. Move all 10 org templates (`organization-sheet.html`, `org-structure.html`, `org-attributes.html`, `org-mandates.html`, `org-methods.html`, `org-conflict.html`, `org-balance-sheet.html`, `org-graph.html`, `org-network.html`, `chat-org-attack.html`) into the new module
> 6. Move the `"organization"` actor type definition from `template.json` into the module's own template definition registered via `module.json`
> 7. Move org-related economics code (`modules/organization/org-economics/` - 5 files) into the new module
> 8. Remove `"organization"` from `system.json` `actorTypes`, `esmodules`, and `styles` arrays
> 9. Remove the org CSS entries from `system.json` styles array
> 10. Remove `ContinuumOrganizationSheet` registration from `sheet-hooks.js`
> 11. Remove the org template partial from `preloadHandlebarsTemplates()` in `sheet-hooks.js`
> 12. Add necessary exports to `system-api.js` so the expansion can access kernel functions, state functions, and item data that the org sheet uses
> 13. The expansion module uses `hooks.once('init')` to register the Organization sheet class and `actorTypes` extension
> 14. Verify that when the expansion is NOT installed, the core character sheet still works perfectly - no missing imports, no 404 templates
> 15. Verify that when the expansion IS installed alongside the core system, Organization appears as an actor type in Foundry's Create Actor dialog
>
> **Shared dependencies to handle**:
> - `modules/network/handle-actor-drop.js` - used by org sheet, lives in core. Expose via `game.system.api` or duplicate.
> - `modules/combat/` - org conflict uses `combat-socket.js`, `defender-profile.js`. These stay in core; org module imports them via `game.system.api`.
> - `modules/state/` - org data storage. These stay in core; expose key functions via `game.system.api`.
> - `item-data.js` - org items reference gear data. Expose via `game.system.api`.
> - `modules/temporal-kernel/` - org lifeline uses spanning/displacement calculations. Expose via `game.system.api`.
> - `modules/temporal-engine/` - org operational lifeline. Expose via `game.system.api`.
> - `modules/temporal-translator/` - date formatting. Expose via `game.system.api`.
>
> **Key files to modify (in core system)**:
> - `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\system.json` - remove organization entries
> - `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\template.json` - remove organization block
> - `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\modules\sheet-hooks.js` - remove org sheet registration, add API exports
> - `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\system-api.js` - add org-relevant exports
> - `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\continuum.js` - no changes needed (doesn't import org)
>
> **Key files to move** (all under `C:\Users\USER\Desktop\FoundryData\Data\systems\continuum-v2\`):
> - `organization-sheet.js`
> - `modules/organization/` (entire directory, 55 JS files + `org-economics/` subdirectory)
> - `styles/organization.css`
> - `styles/org-structure.css`
> - `styles/org-attributes.css`
> - `styles/org-mandates.css`
> - `styles/org-methods.css`
> - `styles/org-conflict.css`
> - `styles/org-balance-sheet.css`
> - `templates/organization-sheet.html`
> - `templates/sections/org-structure.html`
> - `templates/sections/org-attributes.html`
> - `templates/sections/org-mandates.html`
> - `templates/sections/org-methods.html`
> - `templates/sections/org-conflict.html`
> - `templates/sections/org-balance-sheet.html`
> - `templates/sections/org-graph.html`
> - `templates/sections/org-network.html`
> - `templates/chat-org-attack.html`

---

## Summary Checklist

| # | Phase | Effort | Blocks Release? |
|---|-------|--------|-----------------|
| 1 | Purge dev artifacts (~220 MB) | ~1 hr | Yes |
| 2 | i18n (lang/en.json + string replacement) | ~30-40 hrs | Yes |
| 3 | system.json metadata | ~30 min | Yes |
| 4 | Data migration framework | ~2 hrs | Yes |
| 5 | Accessibility (ARIA, focus, keyboard) | ~8-16 hrs | Recommended |
| 6 | Debug cleanup (console, TODO) | ~2 hrs | Yes |
| 7 | Combat tracker integration | ~8-16 hrs | Recommended |
| 8 | Org module breakout | ~8-16 hrs | No (can ship after) |
| 9 | Documentation & compendium packs | ~16-24 hrs | Yes |
| 10 | Responsive CSS | ~4-8 hrs | No |
| 11 | Package.json & build prep | ~2 hrs | Yes |
| 12 | License & legal | ~2 hrs | Yes |
| 13 | Foundry repo submission | ~4 hrs | Yes |