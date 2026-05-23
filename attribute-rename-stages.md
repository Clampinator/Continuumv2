# Attribute Rename: Staged Plan

> Body → Force, Mind → Analyze, EQ → Relate, Quick → React

This document provides a complete, stage-by-stage plan for renaming the four core character attributes across the entire codebase. Each stage is self-contained and can be verified independently before moving on.

Two scopes of rename are addressed:

- **Display Rename** (Stages 1–8): Changes all user-facing labels, comments, and docs. Data model keys remain `body`/`mind`/`eq`/`quick`.
- **Data Model Rename** (Stage 9): Renames the internal keys themselves. Requires a Foundry data migration. Only attempt after Stages 1–8 are complete and verified.

---

## Stage 1: Localization Files

The single source of truth for translated strings. Once these are updated, any template using `{{localize}}` will automatically reflect the new names.

### 1a. `lang/en.json`

| Line | Current | New |
|------|---------|-----|
| 26 | `"Body": "Body"` | `"Body": "Force"` |
| 27 | `"Mind": "Mind"` | `"Mind": "Analyze"` |
| 28 | `"EQ": "EQ"` | `"EQ": "Relate"` |
| 29 | `"Quick": "Quick"` | `"Quick": "React"` |

### 1b. `localisation.md`

| Line | Current | New |
|------|---------|-----|
| 124 | `"Body": "Body",                      [E]` | `"Body": "Force"` |
| 125 | `"Mind": "Mind",                      [E]` | `"Mind": "Analyze"` |
| 126 | `"EQ": "EQ",                          [E]` | `"EQ": "Relate"` |
| 127 | `"Quick": "Quick",                    [E]` | `"Quick": "React"` |
| 242 | `"RunningTooltip": "Running in background (-1 to Mind rolls)"` | `"RunningTooltip": "Running in background (-1 to Analyze rolls)"` |

### Verification

- Load the system in Foundry and open a character sheet. The attribute buttons should still show Force/Analyze/Relate/React (they already do via the HTML, not localization — but confirm no regressions).
- Search for any remaining `"Body": "Body"`, `"Mind": "Mind"`, `"EQ": "EQ"`, `"Quick": "Quick"` in `lang/`.

---

## Stage 2: Kernel & Engine Comments (JSDoc)

These are comment-only changes with zero runtime impact. Safe to do first to make the codebase self-documenting.

### 2a. `modules/temporal-kernel/calculate-quick-penalty.js`

| Line | Current | New |
|------|---------|-----|
| 3 | `Returns the React (Quick) penalty from encumbrance exceeding Body.` | `Returns the React penalty from encumbrance exceeding Force.` |
| 6 | `@param {number} bodyValue - The Body (Force) attribute value.` | `@param {number} bodyValue - The Force attribute value.` |
| 7 | `@returns {number} Non-negative penalty to Quick/Spanning.` | `@returns {number} Non-negative penalty to React/Spanning.` |

### 2b. `modules/temporal-kernel/calculate-wound-capacity.js`

| Line | Current | New |
|------|---------|-----|
| 3 | `A character's wound capacity is Body * 3.` | `A character's wound capacity is Force * 3.` |
| 4 | `@param {number} bodyValue - The Body (Force) attribute value.` | `@param {number} bodyValue - The Force attribute value.` |

### 2c. `modules/temporal-kernel/get-application-volume-limit.js`

| Line | Current | New |
|------|---------|-----|
| 7 | `@param {number} analyzeRank - The character's Analyze (Mind) attribute value.` | `@param {number} analyzeRank - The character's Analyze attribute value.` |

### 2d. `modules/lifeline/services/calculators/roll-math/calculate-mind-penalty.js`

| Line | Current | New |
|------|---------|-----|
| 3 | `Calculates the penalty to Analyze (Mind) rolls from running metability applications.` | `Calculates the penalty to Analyze rolls from running metability applications.` |

### 2e. `modules/lifeline/services/calculators/roll-math/calculate-quick-penalty.js`

| Line | Current | New |
|------|---------|-----|
| 6 | `THE ENCUMBRANCE AUTHORITY: Unified Quick Penalty Calculation.` | `THE ENCUMBRANCE AUTHORITY: Unified React Penalty Calculation.` |
| 7 | `Calculates armor and physical weight penalties for Quick/Spanning.` | `Calculates armor and physical weight penalties for React/Spanning.` |
| 17 | `@returns {number} Floored integer representing the penalty to Quick/Spanning.` | `@returns {number} Floored integer representing the penalty to React/Spanning.` |
| 61 | `// 3. Body Mitigation - delegate to pure Kernel function` | `// 3. Force Mitigation - delegate to pure Kernel function` |

### 2f. `modules/lifeline/services/calculators/roll-math/calculate-base-target.js`

| Line | Current | New |
|------|---------|-----|
| 45 | `// Apply Mind penalty for running applications` | `// Apply Analyze penalty for running applications` |

### 2g. `modules/lifeline/services/calculators/roll-math.js`

| Line | Current | New |
|------|---------|-----|
| 22 | `Proxies call to the atomic mind penalty calculation unit.` | `Proxies call to the atomic Analyze penalty calculation unit.` |

### 2h. `modules/character/handle-gear-use.js`

| Line | Current | New |
|------|---------|-----|
| 3 | `- Firearm: triggers a Quick (ranged) attack roll with the firearm's bonus` | `- Firearm: triggers a React (ranged) attack roll with the firearm's bonus` |

### 2i. `system-api.js`

| Line | Current | New |
|------|---------|-----|
| 22 | `// 3. Apply unified Quick Penalty (Armor + Weapons + Gear)` | `// 3. Apply unified React Penalty (Armor + Weapons + Gear)` |

### Verification

- `npm test` — all tests must pass (no code logic changed, only comments).

---

## Stage 3: User-Facing Strings in JavaScript

These change text displayed to users or sent to AI services.

### 3a. `modules/npc-generator/npc-state.js` — Preset Labels

| Line | Current | New |
|------|---------|-----|
| 46 | `'Physical (High Body/Quick)'` | `'Physical (High Force/React)'` |
| 47 | `'Intellectual (High Mind/EQ)'` | `'Intellectual (High Analyze/Relate)'` |
| 48 | `'Social (High EQ/Mind)'` | `'Social (High Relate/Analyze)'` |

### 3b. `modules/npc-generator/npc-ai-client.js` — AI Prompt

| Line | Current | New |
|------|---------|-----|
| 432 | `` `Body ${customAttributes.body}, Mind ${customAttributes.mind}, EQ ${customAttributes.eq}, Quick ${customAttributes.quick}` `` | `` `Force ${customAttributes.body}, Analyze ${customAttributes.mind}, Relate ${customAttributes.eq}, React ${customAttributes.quick}` `` |

Note: The template variable names (`.body`, `.mind`, etc.) remain the same — only the label text changes.

### 3c. `system-api.js` — Chat Message Flavor Text

| Line | Current | New |
|------|---------|-----|
| 47-48 | `const attributeName = attribute.charAt(0).toUpperCase() + attribute.slice(1);` | Replace with: `import { getAttributeLabel } from './modules/attribute-labels.js';` then `const attributeName = getAttributeLabel(attribute);` |

This fixes a bug where the data key `eq` would render as "Eq" instead of "Relate", and `body` as "Body" instead of "Force". The import must be added at the top of the file.

### 3d. `helptext.js` — Tooltips

| Line | Current | New |
|------|---------|-----|
| 220 | `<strong>Analyze (Mind)</strong> rolls:` | `<strong>Analyze</strong> rolls:` |
| 223 | `<strong>-1 to Mind rolls</strong>.` | `<strong>-1 to Analyze rolls</strong>.` |

Note: Line 177 (`"Coercion: Mind control..."`) uses "Mind" as a common English term ("mind control"), not the attribute. **Do not change.**

### Verification

- Open the NPC wizard. Step 3 preset labels should show "Force/React", "Analyze/Relate", "Relate/Analyze".
- Generate an NPC. The AI prompt should contain "Force X, Analyze Y, Relate Z, React W".
- Open attribute help. The metabilities tooltip should say "Analyze rolls" not "Analyze (Mind) rolls".
- Test `api.rollAP({ actor, attribute: 'eq' })` — the chat message should display "Analyze" or "Relate", not "Eq".

---

## Stage 4: HTML Templates

### 4a. `templates/sections/attributes.html`

| Line | Current | New |
|------|---------|-----|
| 25 | `<!-- Body Block -->` | `<!-- Force Block -->` |
| 29 | `alt="Body Value Spinner"` | `alt="Force Value Spinner"` |
| 34 | `<!-- Mind Block -->` | `<!-- Analyze Block -->` |
| 38 | `alt="Mind Value Spinner"` | `alt="Analyze Value Spinner"` |
| 43 | `<!-- EQ Block -->` | `<!-- Relate Block -->` |
| 47 | `alt="EQ Value Spinner"` | `alt="Relate Value Spinner"` |
| 52 | `<!-- Quick Block -->` | `<!-- React Block -->` |
| 56 | `alt="Quick Value Spinner"` | `alt="React Value Spinner"` |

**Do NOT change** the `data-attribute`, `name`, or `value` attributes — those use the data model keys which stay as `body`/`mind`/`eq`/`quick` until Stage 9.

### 4b. `templates/npc-generator/step-3-capabilities.html`

| Line | Current | New |
|------|---------|-----|
| 85 | `<label for="npc-attr-body">Body</label>` | `<label for="npc-attr-body">Force</label>` |
| 89 | `<label for="npc-attr-mind">Mind</label>` | `<label for="npc-attr-mind">Analyze</label>` |
| 93 | `<label for="npc-attr-eq">EQ</label>` | `<label for="npc-attr-eq">Relate</label>` |
| 97 | `<label for="npc-attr-quick">Quick</label>` | `<label for="npc-attr-quick">React</label>` |

### 4c. `templates/npc-generator/step-5-review.html`

| Line | Current | New |
|------|---------|-----|
| 34 | `Body {{...}}, Mind {{...}}, EQ {{...}}, Quick {{...}}` | `Force {{...}}, Analyze {{...}}, Relate {{...}}, React {{...}}` |

Full current line:
```
<p><strong>Attributes:</strong> Body {{customAttributes.body}}, Mind {{customAttributes.mind}}, EQ {{customAttributes.eq}}, Quick {{customAttributes.quick}}</p>
```
New:
```
<p><strong>Attributes:</strong> Force {{customAttributes.body}}, Analyze {{customAttributes.mind}}, Relate {{customAttributes.eq}}, React {{customAttributes.quick}}</p>
```

### 4d. `templates/dialogs/npc-importer.html`

| Line | Current | New |
|------|---------|-----|
| 28 | `"High Mind and EQ, but low Body"` | `"High Analyze and Relate, but low Force"` |

### 4e. `templates/sections/metabilities.html`

| Line | Current | New |
|------|---------|-----|
| 179 | `eventTitle="Running in background (-1 to Mind rolls)"` | `eventTitle="Running in background (-1 to Analyze rolls)"` |

### Verification

- Open each template in browser. Attribute labels should read "Force", "Analyze", "Relate", "React".
- Spinner `alt` text should match the new names.
- NPC generator labels should show new attribute names.
- Metabilities running tooltip should say "Analyze".

---

## Stage 5: Documentation Files (Markdown)

### 5a. `PUBLISHING_GUIDE.md`

| Line | Current | New |
|------|---------|-----|
| 239 | `"Body": "Body"` | `"Body": "Force"` |
| 240 | `"Mind": "Mind"` | `"Mind": "Analyze"` |
| 241 | `"EQ": "EQ"` | `"EQ": "Relate"` |
| 242 | `"Quick": "Quick"` | `"Quick": "React"` |

Note: Line 965 `"Quick Start"` is a common phrase, not the attribute — **do not change**.

### 5b. `REFACTOR_UI_TO_KERNEL.md`

| Line | Current | New |
|------|---------|-----|
| 25 | `## SECTION 1: Quick Penalty Formula` | `## SECTION 1: React Penalty Formula` |
| 40 | `Returns the Move (Quick) penalty from encumbrance exceeding Body.` | `Returns the React penalty from encumbrance exceeding Force.` |
| 43 | `@param {number} bodyValue - The Body (Force) attribute value.` | `@param {number} bodyValue - The Force attribute value.` |
| 44 | `@returns {number} Non-negative penalty to Quick/Spanning.` | `@returns {number} Non-negative penalty to React/Spanning.` |
| 561 | `Returns the penalty to Analyze (Mind) rolls from running metability apps.` | `Returns the penalty to Analyze rolls from running metability apps.` |
| 565 | `@param {number} analyzeRank - The character's Analyze (Mind) value.` | `@param {number} analyzeRank - The character's Analyze value.` |
| 654 | `@returns {number} Penalty to Quick/Spanning.` | `@returns {number} Penalty to React/Spanning.` |
| 718 | `@param {number} bodyValue - Body attribute value.` | `@param {number} bodyValue - Force attribute value.` |
| 1816 | `- [ ] Section 1: Quick Penalty Formula` | `- [ ] Section 1: React Penalty Formula` |

### 5c. `UI-REFACTOR-PLAN.md`

| Line | Current | New |
|------|---------|-----|
| 429 | `A character's wound capacity is Body * 3.` | `A character's wound capacity is Force * 3.` |
| 430 | `@param {number} bodyValue - The Body (Force) attribute value.` | `@param {number} bodyValue - The Force attribute value.` |
| 667 | `@param {number} analyzeRank - The character's Analyze (Mind) attribute value.` | `@param {number} analyzeRank - The character's Analyze attribute value.` |

### 5d. `FILELIST.md`

| Line | Current | New |
|------|---------|-----|
| 249 | `core attributes (Mind, Body, Quick) and derived values` | `core attributes (Force, Analyze, React) and derived values` |

### Verification

- `grep -r "\bBody\b" *.md` and verify only intentional uses remain (common English words, game lore).

---

## Stage 6: Pre-rendered HTML Documentation

### 6a. `LIFELINE_CHECKLIST.html`

| Line | Current | New |
|------|---------|-----|
| 960 | `Body/Force, Mind/Analyze, EQ/Relate, Quick/React` | `Force, Analyze, Relate, React` |

The current text shows both old and new names separated by slashes. Update to show only the new names.

### 6b. `PUBLISHING_GUIDE.html`

| Line | Current | New |
|------|---------|-----|
| 594 | `"Body": "Body"` | `"Body": "Force"` |
| 595 | `"Mind": "Mind"` | `"Mind": "Analyze"` |
| 596 | `"EQ": "EQ"` | `"EQ": "Relate"` |
| 597 | `"Quick": "Quick"` | `"Quick": "React"` |

### Verification

- Open each HTML file in a browser and search for "Body", "Mind", "EQ", "Quick" to confirm no attribute-name uses remain.

---

## Stage 7: Tests

### 7a. `tests/temporal-kernel/calculate-quick-penalty.test.js`

| Line | Current | New |
|------|---------|-----|
| 5 | `returns 0 when encumbrance equals body` | `returns 0 when encumbrance equals Force` |
| 9 | `returns 0 when encumbrance is less than body` | `returns 0 when encumbrance is less than Force` |
| 13 | `returns the difference when encumbrance exceeds body` | `returns the difference when encumbrance exceeds Force` |

### 7b. `tests/lifeline/.../calculate-base-target.test.js`

The data model keys on lines 26-28 (`quick`, `mind`, `body`) are internal property names — **do not change** in display-only rename. They align with the Foundry data model.

### Verification

- `npm test` — all tests must pass.

---

## Stage 8: Final Sweep & Verification

After Stages 1–7 are complete, do a project-wide search for any remaining instances of the old attribute **names** used as display labels.

### Search Commands

```bash
# Case-sensitive search for attribute-name usage (exclude data model keys)
grep -rn "\"Body\"" modules/ templates/ lang/ helptext.js system-api.js
grep -rn "\"Mind\"" modules/ templates/ lang/ helptext.js system-api.js
grep -rn "\"EQ\"" modules/ templates/ lang/ helptext.js system-api.js
grep -rn "\"Quick\"" modules/ templates/ lang/ helptext.js system-api.js

# Check that attribute-labels.js is correct (already done)
cat modules/attribute-labels.js
```

### Expected Results

- `modules/attribute-labels.js` should have `body: 'Force'`, `mind: 'Analyze'`, `eq: 'Relate'`, `quick: 'React'` (already correct).
- No user-facing text should show "Body", "Mind", "EQ", or "Quick" as an attribute name.
- Data model references (`system.attributes.body.value`, `data-attribute="body"`, `customAttributes.body`, etc.) should **still** use the old keys.
- Common English uses of "mind" (mind control), "body" (sheet body), "quick" (Quick Start, Quick Favor), and "EQ" in non-attribute contexts should remain untouched.

### Full Integration Test

1. Create a new character. Verify attribute labels read Force / Analyze / Relate / React.
2. Create an NPC via the wizard. Verify preset labels show new names. Verify AI prompt uses new names.
3. Import an NPC via the importer. Verify the prompt template references new names.
4. Roll for each attribute. Verify chat messages show the new attribute names.
5. Open metabilities help. Verify "Analyze" used in place of "Mind".
6. Check the metabilities running tooltip. Should say "-1 to Analyze rolls".
7. Run `npm test`. All tests pass.

---

## Stage 9: Data Model Key Rename (Breaking Change — Requires Migration)

> **WARNING**: This stage renames the internal data model keys from `{body, mind, eq, quick}` to `{force, analyze, relate, react}`. This is a **breaking change** that requires a Foundry data migration script. Existing characters will have their data under the old keys and must be migrated. Only attempt this after Stages 1–8 are fully validated and deployed.

### 9a. Write a Foundry Migration Script

Create `modules/migration/attribute-rename.js` that:
1. Iterates all Character actors.
2. For each actor with `system.attributes.body`, renames to `system.attributes.force`.
3. Similarly for `mind` → `analyze`, `eq` → `relate`, `quick` → `react`.
4. Updates `system.spanning` references if needed.
5. Logs migrated actor IDs to console.

### 9b. Update `template.json`

| Line | Current | New |
|------|---------|-----|
| 30 | `"body": { "value": 4 }` | `"force": { "value": 4 }` |
| 31 | `"mind": { "value": 4 }` | `"analyze": { "value": 4 }` |
| 32 | `"eq": { "value": 4 }` | `"relate": { "value": 4 }` |
| 33 | `"quick": { "value": 4 }` | `"react": { "value": 4 }` |

### 9c. Update All JS Property Path References

Every `foundry.utils.getProperty(actor.system, 'attributes.body.value')` → `'attributes.force.value'`, etc. Files affected:

- `modules/lifeline/services/calculators/roll-math/calculate-base-target.js` (lines 30, 34)
- `modules/lifeline/services/calculators/roll-math/calculate-quick-penalty.js` (line 62)
- `modules/lifeline/services/calculators/roll-math/calculate-mind-penalty.js` (line 18)
- `modules/character/handle-app-ingredient-change.js` (line 19)
- `modules/character/initialize-app-spinners.js` (line 100)
- `modules/character/prepare-data.js` (line 31)
- `modules/sheet-data-preparation.js` (line 28)
- `system-api.js` (line 15, default param `attribute = 'body'` → `'force'`)

### 9d. Update All Template Data-Attribute References

Every `data-attribute="body"` → `data-attribute="force"`, etc. Files affected:

- `templates/sections/attributes.html` (lines 27, 28, 31, 36, 37, 40, 45, 46, 49, 54, 55, 58)
- `templates/sections/npc-combat-card.html` (lines 14-17)
- `templates/sections/combat.html` (lines 57, 144, 222)
- `templates/sections/metabilities.html` (no changes — uses different data-attributes)

### 9e. Update All JS Code That Reads `data-attribute` Values

- `modules/character/handle-gear-use.js` line 25: `data-attribute="quick"` → must match new key
- Any event listeners reading `.data('attribute')` or `event.currentTarget.dataset.attribute`

### 9f. Update NPC Generator Data Keys

- `modules/npc-generator/npc-state.js` lines 89-92: `body`, `mind`, `eq`, `quick` → `force`, `analyze`, `relate`, `react`
- `modules/npc-generator/npc-actor-builder.js` lines 270-282: same
- `modules/npc-generator/npc-wizard-app.js` line 154: `['body', 'mind', 'eq', 'quick']` → `['force', 'analyze', 'relate', 'react']`
- `modules/npc-generator/npc-ai-client.js` line 432: template variable names
- `templates/npc-generator/step-3-capabilities.html` lines 86, 90, 94, 98: input `name` attributes
- `templates/npc-generator/step-5-review.html` line 34: Handlebars variable names

### 9g. Update All JS Key-Comparison Logic

- `modules/lifeline/services/calculators/roll-math/calculate-base-target.js` line 46: `key === 'mind'` → `key === 'analyze'`
- `modules/lifeline/handlers/roll-action-handler/perform-roll-action.js` line 101: same
- `modules/lifeline/handlers/roll-action-handler/perform-roll-action.js` line 97: `['quick', 'spanning', 'naturalSpan'].includes(cleanAttrKey)` → `['react', 'spanning', 'naturalSpan']`
- `system-api.js` line 23: `attribute === 'quick'` → `attribute === 'react'`
- `system-api.js` line 13: default param `attribute = 'body'` → `attribute = 'force'`

### 9h. Update Test Fixtures

- `tests/lifeline/.../calculate-base-target.test.js` lines 26-28: `quick`, `mind`, `body` → `react`, `analyze`, `force`

### 9i. Update `attribute-labels.js`

The label map keys change:

```js
const labels = {
    force: 'Force',
    analyze: 'Analyze',
    relate: 'Relate',
    react: 'React',
    naturalspan: 'Nat Span'
};
```

### 9j. Register Migration in `system.json`

Add a migration version flag so Foundry runs the migration on next load.

### Verification (Stage 9)

1. Create a new character. Verify `system.attributes.force`, `.analyze`, `.relate`, `.react` exist in the data.
2. Run migration on an existing character with old keys. Verify keys renamed.
3. Open the character sheet. Verify all spinners, rolls, and tooltips work.
4. All `npm test` must pass with updated fixtures.
5. Create an NPC. Verify the wizard builds actor data with new keys.

---

## Appendix: Items Explicitly NOT Changed

| File | Line | Text | Reason |
|------|------|------|--------|
| `modules/npc-generator/npc-lore.js` | 13 | "like mind" | Common English, not the attribute |
| `modules/npc-generator/npc-lore.js` | 52 | "Man's body a tool" | Common English, not the attribute |
| `modules/npc-generator/npc-lore.js` | 70 | "where the body ends" | Common English, not the attribute |
| `modules/relationships/interactions/handle-node-edit.js` | 72 | "Quick Favor / Debt" | "Quick" = fast, not the React attribute |
| `modules/span-graph-interactions-tooltips.js` | 85 | "Tactical Information (Body)" | "Body" = main section, not Force |
| `styles/gear.css` | 343 | `/* Description / Body */` | CSS `.sheet-body` class, not the attribute |
| `helptext.js` | 177 | "Mind control" | Common English phrase |
| `PUBLISHING_GUIDE.html` | 1212 | "Quick Start" | Common phrase, not the attribute |
| `tests/span-graph/tooltips.test.js` | 22 | `.tooltip-body` | CSS class, not the attribute |
| All Handlebars `{{#if (eq ...)}}` | Various | | The `eq` Handlebars helper is a comparison operator, not the attribute |
| `modules/sheet-hooks.js` | 132 | `Handlebars.registerHelper('eq', ...)` | Handlebars equality helper, not the attribute |