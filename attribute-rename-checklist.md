# Attribute Rename: Regression Checklist

> Execute after completing the attribute rename.
> The codebase has already been partially migrated. This checklist verifies completeness.

## Automated Checks (PowerShell 5.1)

> Run these in an Admin PowerShell session at the project root.
> PowerShell 5.1's Select-String has no -Recurse. Pipe Get-ChildItem instead.

### 1. Unit Tests
```powershell
npm test
```
All tests must pass. Zero failures.

### 2. No Stale Old-Name Localization Values
These should return ZERO hits (localization values should be new names, not old).

```powershell
Get-ChildItem -Recurse -Include "en.json" -Path "lang" | Select-String -Pattern '"Body":\s*"Body"'
Get-ChildItem -Recurse -Include "en.json" -Path "lang" | Select-String -Pattern '"Mind":\s*"Mind"'
Get-ChildItem -Recurse -Include "en.json" -Path "lang" | Select-String -Pattern '"EQ":\s*"EQ"'
Get-ChildItem -Recurse -Include "en.json" -Path "lang" | Select-String -Pattern '"Quick":\s*"Quick"'
```

### 3. No Stale Old Data-Model Keys in Templates
These should return ZERO hits (all template `data-attribute` and `name` bindings should use new keys).

```powershell
Get-ChildItem -Recurse -Include "*.html" -Path "templates" | Select-String -Pattern 'data-attribute="body"'
Get-ChildItem -Recurse -Include "*.html" -Path "templates" | Select-String -Pattern 'data-attribute="mind"'
Get-ChildItem -Recurse -Include "*.html" -Path "templates" | Select-String -Pattern 'data-attribute="eq"'
Get-ChildItem -Recurse -Include "*.html" -Path "templates" | Select-String -Pattern 'data-attribute="quick"'
```

```powershell
Get-ChildItem -Recurse -Include "*.html" -Path "templates" | Select-String -Pattern 'system\.attributes\.body\.'
Get-ChildItem -Recurse -Include "*.html" -Path "templates" | Select-String -Pattern 'system\.attributes\.mind\.'
Get-ChildItem -Recurse -Include "*.html" -Path "templates" | Select-String -Pattern 'system\.attributes\.eq\.'
Get-ChildItem -Recurse -Include "*.html" -Path "templates" | Select-String -Pattern 'system\.attributes\.quick\.'
```

### 4. No Stale Old Data-Model Keys in JS Source (except legacy fallbacks)
These should return ZERO hits. Known legacy fallbacks in `prepare-data.js`, `sheet-data-preparation.js`, `calculate-mind-penalty.js`, `handle-app-ingredient-change.js`, `initialize-app-spinners.js`, and `perform-roll-action.js` are checked separately in step 5.

```powershell
Get-ChildItem -Recurse -Include "*.js" -Path "modules" | Select-String -Pattern "attributes\.body\b" | Where-Object { $_.Path -notmatch 'prepare-data|sheet-data-preparation|calculate-mind-penalty|handle-app-ingredient|initialize-app-spinners|perform-roll-action' }
Get-ChildItem -Recurse -Include "*.js" -Path "modules" | Select-String -Pattern "attributes\.mind\b" | Where-Object { $_.Path -notmatch 'prepare-data|sheet-data-preparation|calculate-mind-penalty|handle-app-ingredient|initialize-app-spinners|calculate-base-target|perform-roll-action' }
Get-ChildItem -Recurse -Include "*.js" -Path "modules" | Select-String -Pattern "attributes\.eq\b"
Get-ChildItem -Recurse -Include "*.js" -Path "modules" | Select-String -Pattern "attributes\.quick\b"
```

### 5. Legacy Fallback Audit
These files intentionally fall back from new keys to old keys for pre-migration actors. Verify each one exists and is correct.

```powershell
# prepare-data.js - should try force first, then body
Select-String -Path "modules\character\prepare-data.js" -Pattern "attributes\.force\.value.*attributes\.body\.value"

# sheet-data-preparation.js - should try force first, then body
Select-String -Path "modules\sheet-data-preparation.js" -Pattern "attributes\.force\.value.*attributes\.body\.value"

# calculate-mind-penalty.js - should try analyze first, then mind
Select-String -Path "modules\lifeline\services\calculators\roll-math\calculate-mind-penalty.js" -Pattern "attributes\.analyze\.value.*attributes\.mind\.value"

# handle-app-ingredient-change.js - should try analyze first, then mind
Select-String -Path "modules\character\handle-app-ingredient-change.js" -Pattern "attributes\?\.analyze.*attributes\?\.mind"

# initialize-app-spinners.js - should try analyze first, then mind
Select-String -Path "modules\character\initialize-app-spinners.js" -Pattern "attributes\?\.analyze.*attributes\?\.mind"

# calculate-base-target.js - key check should accept both 'analyze' and 'mind'
Select-String -Path "modules\lifeline\services\calculators\roll-math\calculate-base-target.js" -Pattern "key === 'analyze' \|\| key === 'mind'"

# perform-roll-action.js - key check should accept both 'analyze' and 'mind', default should be 'force'
Select-String -Path "modules\lifeline\handlers\roll-action-handler\perform-roll-action.js" -Pattern "cleanAttrKey === 'analyze' \|\| cleanAttrKey === 'mind'"
```

Each should return exactly 1 match. If any returns 0, the fallback is missing and pre-migration actors will break.

### 6. Default Attribute Key in perform-roll-action.js
```powershell
Select-String -Path "modules\lifeline\handlers\roll-action-handler\perform-roll-action.js" -Pattern "'body'"
```
Line 86 should read `(attributeName || 'force')` not `(attributeName || 'body')`. If it still says `'body'`, that's a bug.

### 7. attribute-labels.js Legacy Compatibility
```powershell
Select-String -Path "modules\attribute-labels.js" -Pattern "legacyMap"
```
Must return 1 match. Confirms the legacy key mapping for pre-migration actors exists.

### 8. Verify New-Name Keys Are Used in attribute-labels.js
```powershell
Select-String -Path "modules\attribute-labels.js" -Pattern "force: 'Force'|analyze: 'Analyze'|relate: 'Relate'|react: 'React'"
```
Must return 4 matches.

### 9. No Old Attribute Names in Display Strings (JS)
These should return ZERO hits (no user-facing text should use old names).

```powershell
Get-ChildItem -Recurse -Include "*.js" -Path "modules" | Select-String -Pattern '"Body":\s*"Body"|"Mind":\s*"Mind"|"EQ":\s*"EQ"|"Quick":\s*"Quick"'
```

### 10. No Old Attribute Names in Template Display Strings
These should return ZERO hits.

```powershell
Get-ChildItem -Recurse -Include "*.html" -Path "templates" | Select-String -Pattern '>Body<|>Mind<|>EQ<|>Quick<'
Get-ChildItem -Recurse -Include "*.html" -Path "templates" | Select-String -Pattern 'alt="Body |alt="Mind |alt="EQ |alt="Quick '
```

### 11. No Old Names in Help Text
```powershell
Select-String -Path "helptext.js" -Pattern "Mind rolls|Analyze \(Mind\)"
```
Should return ZERO hits. (The term "Mind control" on line 177 is a game-term, not the attribute - that's fine.)

### 12. template.json Uses New Keys
```powershell
Select-String -Path "template.json" -Pattern '"force"|"analyze"|"relate"|"react"'
```
Must return 4 matches (one per attribute in the character schema).

```powershell
Select-String -Path "template.json" -Pattern '"body"|"mind"|"eq"|"quick"'
```
Should return ZERO hits inside the character attributes section. (Organization has `force`/`intel`/`influence`/`comms` which is correct and different.)

### 13. Catch Stale JSDoc Comment References
These should return nothing after all comment updates are complete.

```powershell
Get-ChildItem -Recurse -Include "*.js" -Path "modules\temporal-kernel","modules\lifeline\services\calculators" | Select-String -Pattern '\bBody\b.*attribute|\battribute.*\bBody\b|Quick/Spanning|Quick.*Penalty|Analyze \(Mind\)'
```

---

## Foundry In-App Checks (Manual)

### 14. Create New Character
1. Create a new Character actor.
2. Open the sheet.
3. **Attributes row**: Confirm buttons read **Force / Analyze / Relate / React**.
4. **Alt text**: Inspect spinner images. Alt attributes should be "Force Value Spinner", "Analyze Value Spinner", "Relate Value Spinner", "React Value Spinner".
5. **Spinners**: Click up/down on each spinner. Values should increment and save.

### 15. Attribute Rolls
1. Click **Roll Force**. Chat message should say "Force".
2. Click **Roll Analyze**. Chat message should say "Analyze".
3. Click **Roll Relate**. Chat message should say "Relate".
4. Click **Roll React**. Chat message should say "React".
5. Click **Roll Temp Will** and **Roll Perm Will**. Confirm they still work (regression guard).

### 16. API Roll (Console)
1. Open browser console (F12).
2. Run: `game.system.api.rollAP({ actor: game.actors.getName("<your character>"), attribute: 'relate' })`
3. Chat message flavour text should say **"Relate"**, not "Eq".
4. Run with `attribute: 'force'`. Should say **"Force"**, not "Body".
5. Run with `attribute: 'react'`. Should say **"React"**, not "Quick".
6. Run with `attribute: 'analyze'`. Should say **"Analyze"**, not "Mind".

### 17. NPC Generator Wizard
1. Open NPC Generator.
2. **Step 3 - Capabilities**: Select "Physical" preset. Label should read **"Physical (High Force/React)"**.
3. Select "Intellectual". Should read **"Intellectual (High Analyze/Relate)"**.
4. Select "Social". Should read **"Social (High Relate/Analyze)"**.
5. Select "Custom". Labels should read **Force / Analyze / Relate / React**.
6. **Step 5 - Review**: Attribute summary should read **"Force X, Analyze Y, Relate Z, React W"**.

### 18. NPC Importer Prompt
1. Open the NPC Importer dialog.
2. Expand the AI prompt section.
3. Search for "Body", "Mind", "EQ", "Quick" in the prompt text.
4. Should read **"High Analyze and Relate, but low Force"** instead of old names.

### 19. Metabilities Section
1. Open a character with metabilities (or set one to Operant with apps).
2. Add a metability application. Check the **Running** checkbox.
3. Hover over the "Running" label. Tooltip should say **"Running in background (-1 to Analyze rolls)"**.
4. Open the Metabilities help dialog (? button). Search for "Mind rolls" - should NOT appear. Should say **"Analyze rolls"** instead.

### 20. Combat Section
1. Add a firearm. Click **Attack**. Roll should resolve (react-keyed attack).
2. Add a melee weapon. Click **Attack**. Roll should resolve (force-keyed attack).
3. NPC combat cards: buttons F/A/R/X should work and tooltips read "Roll Force AP", "Roll Analyze AP", "Roll Relate AP", "Roll React AP".

### 21. React Penalty Calculation
1. Create a character with Force 4.
2. Add armor with encumbrance 3. React penalty should show 0.
3. Add armor with encumbrance 6. React penalty should show 2.
4. Verify the penalty still correctly reduces React/Spanning roll targets.

### 22. Wound Capacity
1. Set Force to 5.
2. Add wounds. Wound capacity should be 15 (Force * 3).
3. Verify IP remaining calculates correctly.

### 23. Pre-Migration Character Compatibility (Legacy Fallbacks)
1. Open a character that was created BEFORE the attribute key rename (still has `body`/`mind`/`eq`/`quick` in its data).
2. All attribute values should still display correctly (legacy fallback reads old keys).
3. All spinners should be functional.
4. All rolls should work.
5. No console errors in F12.

### 24. Existing Character Data No Breakage
1. Open a pre-existing character created after the rename (has `force`/`analyze`/`relate`/`react` keys).
2. All attribute values display correctly.
3. All spinners functional.
4. All rolls work.
5. No console errors in F12.

---

## Known Legacy Fallback Locations

These files intentionally fall back from new keys to old keys for pre-migration actor compatibility. Do NOT remove these fallbacks until all existing actors have been migrated:

| File | Line | Fallback Pattern |
|------|------|-----------------|
| `modules/character/prepare-data.js` | 31 | `attributes.force.value \|\| attributes.body.value` |
| `modules/sheet-data-preparation.js` | 28 | `attributes.force.value \|\| attributes.body.value` |
| `modules/lifeline/services/calculators/roll-math/calculate-mind-penalty.js` | 18-19 | `attributes.analyze.value \|\| attributes.mind.value` |
| `modules/character/handle-app-ingredient-change.js` | 19 | `attributes?.analyze?.value \|\| attributes?.mind?.value` |
| `modules/character/initialize-app-spinners.js` | 100 | `attributes?.analyze?.value \|\| attributes?.mind?.value` |
| `modules/lifeline/services/calculators/roll-math/calculate-base-target.js` | 46 | `key === 'analyze' \|\| key === 'mind'` |
| `modules/lifeline/handlers/roll-action-handler/perform-roll-action.js` | 97, 101 | `'react', 'quick'` and `'analyze' \|\| 'mind'` |
| `modules/attribute-labels.js` | 16 | `legacyMap = { body: 'force', mind: 'analyze', eq: 'relate', quick: 'react' }` |

---

## Items Confirmed NOT to Change

| File | Line | Text | Reason |
|------|------|------|--------|
| `modules/npc-generator/npc-lore.js` | 13 | "like mind" | Common English, not the attribute |
| `modules/npc-generator/npc-lore.js` | 52 | "Man's body a tool" | Common English, not the attribute |
| `modules/npc-generator/npc-lore.js` | 70 | "where the body ends" | Common English, not the attribute |
| `modules/relationships/interactions/handle-node-edit.js` | 72 | "Quick Favor / Debt" | "Quick" = fast, not the attribute |
| `modules/span-graph-interactions-tooltips.js` | 85 | "Tactical Information (Body)" | "Body" = main section, not the attribute |
| `styles/gear.css` | 343 | `/* Description / Body */` | CSS `.sheet-body` class |
| `helptext.js` | 177 | "Mind control" | Common English phrase |
| `PUBLISHING_GUIDE.html` | 1212 | "Quick Start" | Common phrase |
| All `{{#if (eq ...)}}` in templates | Various | | Handlebars `eq` helper = equality operator |
| `modules/sheet-hooks.js` | 133 | `Handlebars.registerHelper('eq', ...)` | Handlebars equality helper |
| `modules/organization/org-attributes.html` | 58 | `data-attribute="force"` | Org's own `force` attribute, unrelated to rename |