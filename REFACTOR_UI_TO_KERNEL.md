# REFACTOR_UI_TO_KERNEL.md

Step-by-step guide for migrating value-operating functions out of UI code and
into the Kernel, TTL, or State layers per the Trinity Architecture.

Each section is self-contained. Complete one section, run the tests, then move
to the next. Every section includes: what to create, what to change, what to
delete, and how to verify.

## Conventions

- All new Kernel files go in `modules/temporal-kernel/`
- All new TTL files go in `modules/temporal-translator/`
- All new State files go in `modules/state/`
- All new Engine files go in `modules/temporal-engine/`
- Imports use absolute paths: `/systems/continuum-v2/modules/...`
- Named exports only: `export { functionName };`
- Every exported function gets JSDoc with `@param`, `@returns`, and units
- After each section: `npm test` must pass with zero failures
- The UI caller pattern after refactor: call Kernel function, use result,
  never inline the rule again

---

## SECTION 1: React Penalty Formula

**Current location:** `modules/character/prepare-data.js:34`
**Current location:** `modules/lifeline/services/calculators/roll-math/calculate-quick-penalty.js`
**Problem:** Inline `Math.max(0, totalEncumbrance - bodyValue)` in prepare-data.
Also, `calculate-quick-penalty.js` in lifeline duplicates the concept already
handled by `calculate-total-encumbrance.js` in kernel.

### 1.1 Create Kernel function

Create `modules/temporal-kernel/calculate-quick-penalty.js`:

```js
/**
 * TEMPORAL KERNEL: CALCULATE QUICK PENALTY
 * Returns the React penalty from encumbrance exceeding Force.
 * Game rule: penalty = max(0, totalEncumbrance - bodyValue).
 * @param {number} totalEncumbrance - Total carry weight from armor+gear+weapons.
 * @param {number} bodyValue - The Force attribute value.
 * @returns {number} Non-negative penalty to React/Spanning.
 */
export function calculateQuickPenalty(totalEncumbrance, bodyValue) {
  return Math.max(0, totalEncumbrance - bodyValue);
}
```

### 1.2 Update prepare-data.js

In `modules/character/prepare-data.js`, add import:
```js
import { calculateQuickPenalty } from '/systems/continuum-v2/modules/temporal-kernel/calculate-quick-penalty.js';
```

Replace the inline formula (line 34):
```js
quickPenalty: Math.max(0, totalEncumbrance - bodyValue)
```
With:
```js
quickPenalty: calculateQuickPenalty(totalEncumbrance, bodyValue)
```

### 1.3 Update sheet-data-preparation.js

In `modules/sheet-data-preparation.js`, add the same import and replace the
same inline formula (line 33):
```js
quickPenalty: Math.max(0, totalEncumbrance - bodyValue)
```
With:
```js
quickPenalty: calculateQuickPenalty(totalEncumbrance, bodyValue)
```

### 1.4 Update lifeline RollMath to delegate

In `modules/lifeline/services/calculators/roll-math/calculate-quick-penalty.js`,
the existing function reads actor data directly (armor, gear, weapons, body)
and computes the penalty. This is a different signature (takes an actor) vs
the pure Kernel function (takes numbers). Refactor it to call the Kernel:

Replace the final return line:
```js
return Math.floor(Math.max(0, totalLoad - body));
```
With:
```js
import { calculateQuickPenalty } from '/systems/continuum-v2/modules/temporal-kernel/calculate-quick-penalty.js';
// ... at the end of the function:
return calculateQuickPenalty(totalLoad, body);
```

Remove the `Math.floor` wrapper since the kernel function returns an integer
when given integer inputs, and `calculateTotalEncumbrance` already floors.

### 1.5 Verify

- Run `npm test`
- No tests should reference the old inline formula
- The `calculateQuickPenalty` pure function should get its own test in
  `tests/temporal-kernel/calculate-quick-penalty.js`

---

## SECTION 2: Calculated Age Formatting

**Current location:** `modules/character/prepare-data.js:130-140`
**Current location:** `modules/sheet-data-preparation.js:76-79`
**Problem:** Inline `Math.floor(secs / SECONDS_IN_YEAR)` + remainder division
duplicated in two data-prep files.

### 2.1 Create TTL function

Create `modules/temporal-translator/format-subjective-age.js`:

```js
import { SECONDS_IN_YEAR, SECONDS_IN_DAY } from '/systems/continuum-v2/modules/temporal-engine/constants.js';

/**
 * TTL: FORMAT SUBJECTIVE AGE
 * Converts subjective age in seconds to a { years, days } display object.
 * Used by the Personal Information section to show calculated age.
 * @param {number} seconds - Subjective age in seconds since birth.
 * @returns {{ years: number, days: number }} Whole years and remaining days.
 */
export function formatSubjectiveAge(seconds) {
  const secs = Math.max(0, Number(seconds) || 0);
  return {
    years: Math.floor(secs / SECONDS_IN_YEAR),
    days: Math.floor((secs % SECONDS_IN_YEAR) / SECONDS_IN_DAY)
  };
}
```

### 2.2 Update prepare-data.js

In `modules/character/prepare-data.js`, add import:
```js
import { formatSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/format-subjective-age.js';
```

Remove the `SECONDS_IN_YEAR` and `SECONDS_IN_DAY` imports from the
`temporal-engine/constants.js` line IF they are no longer used elsewhere
in this file (check first - `SECONDS_IN_YEAR` and `SECONDS_IN_DAY` may
still be used). If they are only used for age calc, remove them.

Replace lines 137-140:
```js
context.calculatedAge = {
    years: Math.floor(subjectiveNowSecs / SECONDS_IN_YEAR),
    days:  Math.floor((subjectiveNowSecs % SECONDS_IN_YEAR) / SECONDS_IN_DAY)
};
```
With:
```js
context.calculatedAge = formatSubjectiveAge(subjectiveNowSecs);
```

### 2.3 Update sheet-data-preparation.js

In `modules/sheet-data-preparation.js`, add the same import.

Replace lines 77-80:
```js
context.calculatedAge = {
    years: Math.floor(subjectiveNowSecs / SECONDS_IN_YEAR),
    days:  Math.floor((subjectiveNowSecs % SECONDS_IN_YEAR) / SECONDS_IN_DAY)
};
```
With:
```js
context.calculatedAge = formatSubjectiveAge(subjectiveNowSecs);
```

Remove `SECONDS_IN_YEAR` and `SECONDS_IN_DAY` imports if no longer used.

### 2.4 Verify

- `npm test`
- Create `tests/temporal-translator/format-subjective-age.js`:
  - Test 0 seconds -> { years: 0, days: 0 }
  - Test SECONDS_IN_YEAR -> { years: 1, days: 0 }
  - Test SECONDS_IN_YEAR + SECONDS_IN_DAY -> { years: 1, days: 1 }
  - Test negative input -> { years: 0, days: 0 }

---

## SECTION 3: Resonance Bonus Classification

**Current location:** `sheet-dice-roller.js:32-40`
**Problem:** Maps numeric bonus value to resonance key (`>=3 -> strong`,
`>=2 -> firm`, `>=1 -> slight`) inline in an event handler.

### 3.1 Create Kernel function

Create `modules/temporal-kernel/classify-resonance-bonus.js`:

```js
/**
 * TEMPORAL KERNEL: CLASSIFY RESONANCE BONUS
 * Maps a numeric resonance bonus to a tier key.
 * Game rule: 3+ = strong, 2 = firm, 1 = slight, 0 = none.
 * @param {number} bonusValue - Numeric resonance bonus from experience.
 * @returns {string} Tier key: 'strong', 'firm', 'slight', or 'none'.
 */
export function classifyResonanceBonus(bonusValue) {
  if (bonusValue >= 3) return 'strong';
  if (bonusValue >= 2) return 'firm';
  if (bonusValue >= 1) return 'slight';
  return 'none';
}
```

### 3.2 Update sheet-dice-roller.js

In `sheet-dice-roller.js`, add import:
```js
import { classifyResonanceBonus } from '/systems/continuum-v2/modules/temporal-kernel/classify-resonance-bonus.js';
```

Replace lines 32-40:
```js
html.find('.experience-resonance-select').on('change', (e) => {
    const bonusValue = parseInt(e.currentTarget.value) || 0;
    let resonanceKey = 'none';
    if (bonusValue >= 3) resonanceKey = 'strong';
    else if (bonusValue >= 2) resonanceKey = 'firm';
    else if (bonusValue >= 1) resonanceKey = 'slight';
    const radio = html.find(`input[name="resonance_choice"][value="${resonanceKey}"]`);
    if (radio.length) radio.prop('checked', true).trigger('change');
});
```
With:
```js
html.find('.experience-resonance-select').on('change', (e) => {
    const bonusValue = parseInt(e.currentTarget.value) || 0;
    const resonanceKey = classifyResonanceBonus(bonusValue);
    const radio = html.find(`input[name="resonance_choice"][value="${resonanceKey}"]`);
    if (radio.length) radio.prop('checked', true).trigger('change');
});
```

### 3.3 Verify

- `npm test`
- Create `tests/temporal-kernel/classify-resonance-bonus.js`:
  - 0 -> 'none', 1 -> 'slight', 2 -> 'firm', 3 -> 'strong', 4 -> 'strong'
  - negative -> 'none'

---

## SECTION 4: Application Highest Rank

**Current location:** `modules/character/handle-app-apply.js:33`
**Problem:** `Math.max(...META_KEYS.map(k => Number(app[k]) || 0))` computes
highest ingredient rank inline in a click handler.

### 4.1 Create Kernel function

Create `modules/temporal-kernel/get-application-highest-rank.js`:

```js
/**
 * TEMPORAL KERNEL: GET APPLICATION HIGHEST RANK
 * Returns the highest ingredient rank in a metability application.
 * Used by the Apply button to determine push slider zero point.
 * @param {object} application - Application data with coercion, creativity,
 *   farsense, pk, redaction numeric fields.
 * @returns {number} The highest single-ingredient rank (0-5).
 */
export function getApplicationHighestRank(application) {
  const keys = ['coercion', 'creativity', 'farsense', 'pk', 'redaction'];
  return Math.max(...keys.map(k => Number(application[k]) || 0));
}
```

### 4.2 Update handle-app-apply.js

In `modules/character/handle-app-apply.js`, add import:
```js
import { getApplicationHighestRank } from '/systems/continuum-v2/modules/temporal-kernel/get-application-highest-rank.js';
```

Remove the `META_KEYS` constant (line 12):
```js
const META_KEYS = ['coercion', 'creativity', 'farsense', 'pk', 'redaction'];
```

Replace line 33:
```js
const appHighestRank = Math.max(...META_KEYS.map(k => Number(app[k]) || 0));
```
With:
```js
const appHighestRank = getApplicationHighestRank(app);
```

### 4.3 Verify

- `npm test`
- Create `tests/temporal-kernel/get-application-highest-rank.js`:
  - All zeros -> 0
  - Mixed {coercion: 2, creativity: 0, ...} -> 2
  - All equal {coercion: 3, creativity: 3, ...} -> 3

---

## SECTION 5: isDeletable Template Helper

**Current location:** `modules/sheet-hooks.js:142-147`
**Problem:** Game rule (can an item be safely deleted?) lives in a Handlebars
helper instead of Kernel.

### 5.1 Create Kernel function

Create `modules/temporal-kernel/is-item-deletable.js`:

```js
/**
 * TEMPORAL KERNEL: IS ITEM DELETABLE
 * Determines whether a repeating-section item can be safely deleted.
 * Game rule: items with no meaningful content (empty or "none") are deletable.
 * @param {object} item - Item with name, description, and/or eventTitle fields.
 * @param {string} [type] - Item type (unused but reserved for type-specific rules).
 * @returns {boolean} True if the item has no meaningful content.
 */
export function isItemDeletable(item, type) {
  if (!item) return true;
  const safeTrim = (val) => String(val || '').trim();
  const val = safeTrim(item.name || item.description || item.eventTitle);
  return !val || val.toLowerCase() === 'none';
}
```

### 5.2 Update sheet-hooks.js

In `modules/sheet-hooks.js`, add import:
```js
import { isItemDeletable } from '/systems/continuum-v2/modules/temporal-kernel/is-item-deletable.js';
```

Replace the Handlebars helper registration (lines 142-147):
```js
Handlebars.registerHelper('isDeletable', function(item, type) {
    if (!item) return true;
    const safeTrim = (val) => String(val || '').trim();
    const val = safeTrim(item.name || item.description || item.eventTitle);
    return !val || val.toLowerCase() === 'none';
});
```
With:
```js
Handlebars.registerHelper('isDeletable', function(item, type) {
    return isItemDeletable(item, type);
});
```

The Handlebars helper still exists (templates use `{{#unless (isDeletable ...)}}`),
but all rule logic delegates to Kernel. The helper is now a thin wrapper.

### 5.3 Verify

- `npm test`
- Create `tests/temporal-kernel/is-item-deletable.js`:
  - null -> true
  - { name: '' } -> true
  - { name: 'none' } -> true
  - { name: 'None' } -> true
  - { name: 'Sword' } -> false
  - { description: '  ' } -> true
  - { eventTitle: 'Battle' } -> false

---

## SECTION 6: metaLabel Template Helper

**Current location:** `modules/sheet-hooks.js:133-136`
**Problem:** Game data (rank labels) lives in a Handlebars helper instead of
Kernel.

### 6.1 Create Kernel constant + accessor

Create `modules/temporal-kernel/meta-rank-labels.js`:

```js
/**
 * TEMPORAL KERNEL: META RANK LABELS
 * Canonical mapping of metability rank numbers to display names.
 * Game data: 0=Latent, 1=Novice, 2=Apprentice, 3=Journeyman, 4=Master,
 * 5=Grand Master.
 */
export const META_RANK_LABELS = [
  'Latent', 'Novice', 'Apprentice', 'Journeyman', 'Master', 'Grand Master'
];

/**
 * Returns the display label for a metability rank.
 * @param {number} rank - Metability rank (0-5).
 * @returns {string} Display label, or "Rank N" for out-of-range values.
 */
export function getMetaLabel(rank) {
  return META_RANK_LABELS[Number(rank)] || `Rank ${rank}`;
}
```

### 6.2 Update sheet-hooks.js

In `modules/sheet-hooks.js`, add import:
```js
import { getMetaLabel } from '/systems/continuum-v2/modules/temporal-kernel/meta-rank-labels.js';
```

Replace lines 133-136:
```js
Handlebars.registerHelper('metaLabel', function(rank) {
    const labels = ['Latent', 'Novice', 'Apprentice', 'Journeyman', 'Master', 'Grand Master'];
    return labels[Number(rank)] || `Rank ${rank}`;
});
```
With:
```js
Handlebars.registerHelper('metaLabel', function(rank) {
    return getMetaLabel(rank);
});
```

### 6.3 Update continuum.js

In `continuum.js`, the `_updateMetabilityInfo` method reads `ITEM_DATA.metabilities[metabilityName]?.ranks[displayRank]`
directly. This is reference data lookup, not a rule - it stays. But if
`getMetaLabel` is needed elsewhere in the sheet JS (not just templates),
import it from Kernel instead of re-declaring labels.

### 6.4 Verify

- `npm test`
- Create `tests/temporal-kernel/meta-rank-labels.js`:
  - getMetaLabel(0) -> 'Latent'
  - getMetaLabel(5) -> 'Grand Master'
  - getMetaLabel(6) -> 'Rank 6'
  - getMetaLabel(-1) -> 'Rank -1'

---

## SECTION 7: Unit Tier Extraction

**Current location:** `continuum.js:29-40`
**Problem:** The `resourceState` Handlebars helper extracts a unit tier number
from a size string via `size.match(/\d+/)` - this is rule logic parsing.

### 7.1 Create Kernel function

Create `modules/temporal-kernel/parse-unit-tier.js`:

```js
/**
 * TEMPORAL KERNEL: PARSE UNIT TIER
 * Extracts the numeric tier from an organization unit size string.
 * Example: "Unit 3" -> 3, "Tier 2" -> 2, "5" -> 5.
 * Returns 0 for non-matching strings (treated as un-gated).
 * @param {string} size - The unit size string.
 * @returns {number} The extracted tier, or 0 if no number found.
 */
export function parseUnitTier(size) {
  if (!size) return 0;
  const sizeMatch = String(size).match(/\d+/);
  return sizeMatch ? parseInt(sizeMatch[0]) : 0;
}
```

### 7.2 Update continuum.js

In `continuum.js`, add import:
```js
import { parseUnitTier } from '/systems/continuum-v2/modules/temporal-kernel/parse-unit-tier.js';
```

Replace lines 29-40:
```js
Handlebars.registerHelper('resourceState', function(actor, size) {
    if (!actor || !size) return "";
    
    const externalRep = Number(foundry.utils.getProperty(actor, "system.attributes.externalReputation.value")) || 0;
    const sizeMatch = size.match(/\d+/);
    const unitTier = sizeMatch ? parseInt(sizeMatch[0]) : 0;

    if (isUnitGated(unitTier, externalRep)) {
      return new Handlebars.SafeString(`<span class="unit-status-gated" title="Gated by External Reputation"><i class="fas fa-lock"></i> Gated</span>`);
    }
    return "";
});
```
With:
```js
Handlebars.registerHelper('resourceState', function(actor, size) {
    if (!actor || !size) return "";
    
    const externalRep = Number(foundry.utils.getProperty(actor, "system.attributes.externalReputation.value")) || 0;
    const unitTier = parseUnitTier(size);

    if (isUnitGated(unitTier, externalRep)) {
      return new Handlebars.SafeString(`<span class="unit-status-gated" title="Gated by External Reputation"><i class="fas fa-lock"></i> Gated</span>`);
    }
    return "";
});
```

### 7.3 Verify

- `npm test`
- Create `tests/temporal-kernel/parse-unit-tier.js`:
  - "Unit 3" -> 3
  - "5" -> 5
  - "" -> 0
  - null -> 0
  - "NoNumber" -> 0

---

## SECTION 8: Move Lifeline Rule Calculators to Kernel

**Current location:** `modules/lifeline/services/calculators/roll-math/`
**Problem:** `calculate-base-target.js`, `calculate-quick-penalty.js`, and
`calculate-mind-penalty.js` are game rules living in the lifeline UI layer.

### 8.1 Move calculate-base-target

a) Create `modules/temporal-kernel/calculate-base-target.js` by copying the
   contents of `modules/lifeline/services/calculators/roll-math/calculate-base-target.js`
   EXACTLY as-is (including the `calculateMindPenalty` import, but update the
   path).

b) Update the import in the new file:
```js
import { calculateMindPenalty } from '/systems/continuum-v2/modules/temporal-kernel/calculate-mind-penalty.js';
```

c) In `modules/lifeline/services/calculators/roll-math/calculate-base-target.js`,
   replace the entire file body with a re-export from the Kernel:
```js
export { calculateBaseTarget } from '/systems/continuum-v2/modules/temporal-kernel/calculate-base-target.js';
```

d) Update `modules/lifeline/services/calculators/roll-math.js` - no changes
   needed since it imports from the atomic file which now re-exports.

### 8.2 Move calculate-mind-penalty

a) Create `modules/temporal-kernel/calculate-mind-penalty.js` by copying from
   `modules/lifeline/services/calculators/roll-math/calculate-mind-penalty.js`.

b) Update the file to NOT use `foundry.utils.getProperty` directly. Instead,
   accept the applications and analyze value as parameters:
```js
/**
 * TEMPORAL KERNEL: CALCULATE MIND PENALTY
 * Returns the penalty to Analyze rolls from running metability apps.
 * Free capacity: running apps whose total levels fit within (Analyze - 1).
 * Overflow: each app beyond free capacity costs -1.
 * @param {object[]} runningApps - Array of running app objects with .level.
 * @param {number} analyzeRank - The character's Analyze value.
 * @returns {number} Non-positive penalty (0 or negative).
 */
export function calculateMindPenalty(runningApps, analyzeRank) {
  if (!runningApps.length) return 0;
  const freeCapacity = Math.max(0, analyzeRank - 1);
  const levels = runningApps
    .map(a => Number(a.level) || 1)
    .sort((a, b) => b - a);
  let used = 0;
  let freeCount = 0;
  for (const level of levels) {
    if (used + level <= freeCapacity) { used += level; freeCount++; }
    else break;
  }
  return -(runningApps.length - freeCount);
}
```

c) In the lifeline version
   (`modules/lifeline/services/calculators/roll-math/calculate-mind-penalty.js`),
   replace with an adapter that reads actor data and calls the Kernel:
```js
import { calculateMindPenalty } from '/systems/continuum-v2/modules/temporal-kernel/calculate-mind-penalty.js';

export { calculateMindPenalty as calculateMindPenalty };

// Legacy adapter: reads actor data, delegates to Kernel.
// NOTE: The Kernel function takes (runningApps, analyzeRank).
// This adapter extracts them from the actor for backward compatibility.
export function calculateMindPenaltyFromActor(actor) {
  const apps = Object.values(
    foundry.utils.getProperty(actor.system, 'metabilities.applications') || {}
  ).filter(a => a.running);
  const analyze = Number(
    foundry.utils.getProperty(actor.system, 'attributes.mind.value')
  ) || 0;
  return calculateMindPenalty(apps, analyze);
}
```

d) Update `calculate-base-target.js` (both Kernel and lifeline versions) to
   call the Kernel's `calculateMindPenalty` with proper parameters. In the
   Kernel version, the `calculateBaseTarget` function currently takes an
   `actor` object. To keep it working, add a helper that extracts apps:

   In the Kernel `calculate-base-target.js`, replace the direct call:
   ```js
   if (key === 'mind') {
       base += calculateMindPenalty(actor);
   }
   ```
   This temporarily keeps the actor-based signature. A future refactor will
   make `calculateBaseTarget` accept pure data instead of an actor. For now,
   import the adapter:
   ```js
   import { calculateMindPenalty } from '/systems/continuum-v2/modules/temporal-kernel/calculate-mind-penalty.js';
   ```
   And change the call to extract the data:
   ```js
   if (key === 'mind') {
       const apps = Object.values(
         foundry.utils.getProperty(actor.system, 'metabilities.applications') || {}
       ).filter(a => a.running);
       const analyze = Number(foundry.utils.getProperty(actor.system, 'attributes.mind.value')) || 0;
       base += calculateMindPenalty(apps, analyze);
   }
   ```

### 8.3 Move calculate-quick-penalty (adapter pattern)

The lifeline `calculate-quick-penalty.js` takes an `actor` and reads all its
data. The Kernel already has `calculateTotalEncumbrance` (pure) and the new
`calculateQuickPenalty` (pure, from Section 1). The lifeline version is an
integration function that reads actor data and calls the pure functions.

In `modules/lifeline/services/calculators/roll-math/calculate-quick-penalty.js`,
refactor to delegate to the Kernel:

```js
import { calculateQuickPenalty } from '/systems/continuum-v2/modules/temporal-kernel/calculate-quick-penalty.js';
import { calculateTotalEncumbrance } from '/systems/continuum-v2/modules/temporal-kernel/calculate-total-encumbrance.js';
import { calculateGearWeight } from '/systems/continuum-v2/modules/temporal-kernel/calculate-gear-weight.js';
import { ITEM_DATA } from '../../../../../item-data.js';

/**
 * Actor-level adapter: reads all encumbrance data from the actor and
 * delegates to the pure Kernel calculateQuickPenalty function.
 * @param {Actor} actor
 * @returns {number} Penalty to React/Spanning.
 */
export function calculateQuickPenalty(actor) {
    if (!actor || actor.type !== 'character') return 0;
    const armorItems = Object.values(actor.system.combat?.armor || {});
    const rangedWeapons = Object.values(actor.system.combat?.rangedWeapons || {});
    const meleeWeapons = Object.values(actor.system.combat?.meleeWeapons || {});
    const carriedGear = actor.items.filter(i => i.type === 'gear' && i.system.carried);
    const totalGearWeight = calculateGearWeight(carriedGear);
    const totalEncumbrance = calculateTotalEncumbrance(
        armorItems, rangedWeapons, meleeWeapons,
        totalGearWeight, ITEM_DATA.armor, ITEM_DATA.rangedWeapons, ITEM_DATA.meleeWeapons
    );
    const body = Number(foundry.utils.getProperty(actor.system, 'attributes.body.value')) || 0;
    return calculateQuickPenalty(totalEncumbrance, body);
}
```

NOTE: The import name conflicts with the Kernel function. Use a different
export name or import alias:
```js
import { calculateQuickPenalty as kernelQuickPenalty } from '/systems/continuum-v2/modules/temporal-kernel/calculate-quick-penalty.js';
```
Then call `kernelQuickPenalty(totalEncumbrance, body)` inside the adapter.

### 8.4 Verify

- `npm test`
- Move or create tests for the Kernel-level pure functions in
  `tests/temporal-kernel/`
- Test `calculateMindPenalty` with:
  - Empty apps -> 0
  - 1 running app level 1, analyze 2 -> 0
  - 3 running apps, levels [1,1,2], analyze 2 -> -1
- Test `calculateBaseTarget` with:
  - key='body', actor with body 5 -> 5 minus wound IP
  - key='meta-coercion', metabilities all 0 -> 0
  - key='mind', running app penalty applied

---

## SECTION 9: Deduplicate _calculateArmorSummary

**Current location:** `modules/character/prepare-data.js:24-36`
**Current location:** `modules/sheet-data-preparation.js:21-33`
**Problem:** Identical function in two files.

### 9.1 Create Engine function

Create `modules/temporal-engine/compute-armor-summary.js`:

```js
import { calculateArmorIpTotals } from '/systems/continuum-v2/modules/temporal-kernel/calculate-armor-ip-totals.js';
import { calculateTotalEncumbrance } from '/systems/continuum-v2/modules/temporal-kernel/calculate-total-encumbrance.js';
import { calculateQuickPenalty } from '/systems/continuum-v2/modules/temporal-kernel/calculate-quick-penalty.js';

/**
 * TEMPORAL ENGINE: COMPUTE ARMOR SUMMARY
 * Orchestrates armor IP totals, encumbrance, and quick penalty.
 * @param {object[]} armorItems - Armor items array.
 * @param {object[]} rangedWeapons - Ranged weapons array.
 * @param {object[]} meleeWeapons - Melee weapons array.
 * @param {number} totalGearWeight - Total carried gear weight.
 * @param {object} itemDataCatalog - ITEM_DATA for fallback lookups.
 * @param {number} bodyValue - Force attribute value.
 * @returns {{ totalIpA..G, totalEncumbrance, quickPenalty }}
 */
export function computeArmorSummary(armorItems, rangedWeapons, meleeWeapons, totalGearWeight, itemDataCatalog, bodyValue) {
  const ipTotals = calculateArmorIpTotals(armorItems);
  const totalEncumbrance = calculateTotalEncumbrance(
    armorItems, rangedWeapons, meleeWeapons,
    totalGearWeight, itemDataCatalog.armor, itemDataCatalog.rangedWeapons, itemDataCatalog.meleeWeapons
  );
  return {
    ...ipTotals,
    totalEncumbrance,
    quickPenalty: calculateQuickPenalty(totalEncumbrance, bodyValue)
  };
}
```

### 9.2 Update prepare-data.js

In `modules/character/prepare-data.js`, add import:
```js
import { computeArmorSummary } from '/systems/continuum-v2/modules/temporal-engine/compute-armor-summary.js';
```

Remove the `_calculateArmorSummary` function (lines 24-36).

Replace the call at line 154:
```js
_calculateArmorSummary(context);
```
With:
```js
const bodyVal = Number(context.system.attributes?.body?.value) || 0;
context.armorSummary = computeArmorSummary(
  context.armorItems, context.rangedWeapons, context.meleeWeapons,
  context.totalGearWeight || 0, ITEM_DATA, bodyVal
);
```

Remove the now-unused imports: `calculateArmorIpTotals`,
`calculateTotalEncumbrance`, `calculateQuickPenalty` IF they are not used
elsewhere in this file.

### 9.3 Update sheet-data-preparation.js

Same pattern as 9.2.

### 9.4 Verify

- `npm test`
- Existing armor/encumbrance tests should pass unchanged

---

## SECTION 10: Flatten Actor History (Deduplicate Era Sorting)

**Current location:** `modules/character/prepare-data.js:99-128`
**Current location:** `modules/sheet-data-preparation.js:61-74`
**Problem:** Era/experience/event flattening + sorting duplicated in two files.

### 10.1 Create State function

Create `modules/state/flatten-actor-history.js`:

```js
/**
 * STATE: FLATTEN ACTOR HISTORY
 * Converts raw era/experience/event DB objects into sorted arrays
 * suitable for template rendering. Handles both ascending and descending
 * sort directions.
 * @param {object} rawEras - The actor.system.eras object.
 * @param {string} sortDirection - 'asc' or 'desc'.
 * @returns {object[]} Array of era objects with nested .experiences and .events arrays.
 */
export function flattenActorHistory(rawEras, sortDirection = 'desc') {
  const eras = Object.entries(rawEras || {}).map(([id, era]) => {
    const experiences = Object.entries(era.experiences || {}).map(([eid, exp]) => {
      const events = Object.entries(exp.events || {}).map(([evid, ev]) => ({ ...ev, id: evid }));
      sortCollection(events, sortDirection);
      return { ...exp, id: eid, sourceEraId: era.id, events };
    });
    sortCollection(experiences, sortDirection);
    const eraEvents = Object.entries(era.events || {}).map(([evid, ev]) => ({ ...ev, id: evid, eraId: id, expId: null }));
    sortCollection(eraEvents, sortDirection);
    return { ...era, id, experiences, events: eraEvents };
  });
  sortCollection(eras, sortDirection);
  return eras;
}

function sortCollection(items, direction) {
  if (direction === 'desc') {
    items.sort((a, b) => (Number(b.sort) || 0) - (Number(a.sort) || 0));
  } else {
    items.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
  }
}
```

### 10.2 Update prepare-data.js

In `modules/character/prepare-data.js`, add import:
```js
import { flattenActorHistory } from '/systems/continuum-v2/modules/state/flatten-actor-history.js';
```

Replace lines 99-128 with:
```js
const rawEras = context.system.eras || {};
context.eras = flattenActorHistory(rawEras, context.timelineSortDirection);
```

### 10.3 Update sheet-data-preparation.js

Same replacement.

### 10.4 Verify

- `npm test`
- Create `tests/state/flatten-actor-history.js`:
  - Empty eras -> []
  - Single era with nested experience/events -> correct structure
  - Desc sort -> highest sort first
  - Asc sort -> lowest sort first

---

## SECTION 11: Flatten Collection Utility

**Current location:** `modules/character/prepare-data.js:142-148`
**Current location:** `modules/sheet-data-preparation.js:82-99`
**Problem:** Repeated `Object.entries(X).map(([id, o]) => ({ id, ...o }))`
pattern for goals, yet, favors, relationships, etc.

### 11.1 Create State utility

Create `modules/state/flatten-collection.js`:

```js
/**
 * STATE: FLATTEN COLLECTION
 * Converts a DB object (keyed by ID) into an array with id included.
 * @param {object} collection - The keyed object (e.g., system.goals).
 * @returns {object[]} Array of objects each with an .id property.
 */
export function flattenCollection(collection) {
  return Object.entries(collection || {}).map(([id, item]) => ({ id, ...item }));
}
```

### 11.2 Update prepare-data.js

In `modules/character/prepare-data.js`, add import:
```js
import { flattenCollection } from '/systems/continuum-v2/modules/state/flatten-collection.js';
```

Replace:
```js
context.goals = allGoals.filter(g => g.importance !== 'Achieved');
```
And the surrounding `Object.entries()` calls for yet, favors, relationships
with `flattenCollection` calls. Example:
```js
const allGoals = flattenCollection(context.system.goals);
const allGoalsSorted = allGoals.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
context.goals = allGoalsSorted.filter(g => g.importance !== 'Achieved');
context.resolvedGoals = allGoalsSorted.filter(g => g.importance === 'Achieved');
context.yetItems = flattenCollection(context.system.theYet);
context.favors = flattenCollection(context.system.favors);
context.relationships = flattenCollection(context.system.relationships);
```

### 11.3 Update sheet-data-preparation.js

Same pattern.

### 11.4 Verify

- `npm test`

---

## SECTION 12: Date Normalization in _updateObject

**Current location:** `continuum.js:103-112`
**Problem:** Loop iterating formData calling `isDateField` + `normalizeDateInput`
inline in the sheet's `_updateObject`.

### 12.1 Create TTL function

Create `modules/temporal-translator/normalize-form-dates.js`:

```js
import { isDateField } from '/systems/continuum-v2/modules/temporal-translator/date-field-registry.js';
import { normalizeDateInput } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';

/**
 * TTL: NORMALIZE FORM DATES
 * Scans a flat formData object and normalizes any date field values.
 * Used by _updateObject to ensure all date inputs are consistently formatted
 * before being sent to the database.
 * @param {object} formData - Flat key-value form data (will be mutated).
 * @returns {object} The same formData object (mutated in place for convenience).
 */
export function normalizeFormDates(formData) {
  for (const key in formData) {
    const value = formData[key];
    if (typeof value === 'string' && isDateField(key)) {
      formData[key] = normalizeDateInput(value);
    }
  }
  return formData;
}
```

### 12.2 Update continuum.js

In `continuum.js`, add import:
```js
import { normalizeFormDates } from '/systems/continuum-v2/modules/temporal-translator/normalize-form-dates.js';
```

Remove the `isDateField` import (line 17) if no longer used directly.

Replace lines 104-112:
```js
for (const key in formData) {
    const value = formData[key];
    if (typeof value === 'string' && value.includes('\n')) {
        formData[key] = value.split('\n').map(line => line.trimStart()).join('\n');
    }
    if (typeof value === 'string' && isDateField(key)) {
        formData[key] = normalizeDateInput(value);
    }
}
```
With:
```js
for (const key in formData) {
    const value = formData[key];
    if (typeof value === 'string' && value.includes('\n')) {
        formData[key] = value.split('\n').map(line => line.trimStart()).join('\n');
    }
}
normalizeFormDates(formData);
```

NOTE: The newline trimming stays inline (it's not a date concern). The
`normalizeFormDates` function is called after the whitespace cleanup.

### 12.3 Verify

- `npm test`
- Create `tests/temporal-translator/normalize-form-dates.js`:
  - Object with date field -> normalized
  - Object with non-date field -> unchanged
  - Object with both -> only date field normalized

---

## SECTION 13: Combat/Vehicle Auto-Fill on _updateObject

**Current location:** `continuum.js:119-151`
**Current location:** `modules/character/activate-listeners.js:124-139`
**Problem:** When a weapon/armor/vehicle name changes, stats are auto-filled
from `ITEM_DATA`. This is DB mutation logic in the UI save path.

### 13.1 Create Engine function

Create `modules/temporal-engine/apply-reference-stats.js`:

```js
import { resolveItemStats } from '/systems/continuum-v2/modules/temporal-kernel/resolve-item-stats.js';
import { resolveVehicleStats } from '/systems/continuum-v2/modules/temporal-kernel/resolve-vehicle-stats.js';

/**
 * TEMPORAL ENGINE: APPLY REFERENCE STATS
 * Scans expanded form data for weapon/armor/vehicle name changes and
 * auto-populates stat fields from the ITEM_DATA catalog.
 * @param {object} expandedSystemData - The expanded `system` portion of formData.
 * @param {object} itemDataCatalog - The full ITEM_DATA object.
 * @returns {object} Updates to merge into formData (key=dotpath, value=stat).
 */
export function applyReferenceStats(expandedSystemData, itemDataCatalog) {
  const updates = {};
  if (expandedSystemData.combat) {
    for (const itemType of ['rangedWeapons', 'meleeWeapons', 'armor']) {
      const items = expandedSystemData.combat[itemType];
      if (!items) continue;
      for (const [id, item] of Object.entries(items)) {
        if (item.name) {
          const selectedItemData = resolveItemStats(itemType, item.name, itemDataCatalog);
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
  for (const key of ['vehicles', 'airVehicles', 'waterVehicles']) {
    const items = expandedSystemData[key];
    if (!items) continue;
    for (const [id, item] of Object.entries(items)) {
      if (item.name) {
        const selectedItemData = resolveVehicleStats(item.name, itemDataCatalog);
        if (selectedItemData) {
          const pathPrefix = `system.${key}.${id}`;
          for (const [stat, statValue] of Object.entries(selectedItemData)) {
            updates[`${pathPrefix}.${stat}`] = statValue;
          }
        }
      }
    }
  }
  return updates;
}
```

### 13.2 Update continuum.js

In `continuum.js`, add import:
```js
import { applyReferenceStats } from '/systems/continuum-v2/modules/temporal-engine/apply-reference-stats.js';
import { normalizeFormDates } from '/systems/continuum-v2/modules/temporal-translator/normalize-form-dates.js';
```

Remove the `resolveItemStats` and `resolveVehicleStats` imports (lines 20-21).

Replace lines 117-151:
```js
const expandedData = foundry.utils.expandObject(formData);
const updates = {};
for (const [key, value] of Object.entries(expandedData.system || {})) {
    if (key === 'combat') {
        for (const [itemType, items] of Object.entries(value)) {
            if (itemType !== 'rangedWeapons' && itemType !== 'meleeWeapons' && itemType !== 'armor') continue;
            for (const [id, item] of Object.entries(items)) {
                if (item.name) {
                    const selectedItemData = resolveItemStats(itemType, item.name, ITEM_DATA);
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
                const selectedItemData = resolveVehicleStats(item.name, ITEM_DATA);
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
```
With:
```js
const expandedData = foundry.utils.expandObject(formData);
const refUpdates = applyReferenceStats(expandedData.system || {}, ITEM_DATA);
if (Object.keys(refUpdates).length > 0) foundry.utils.mergeObject(formData, refUpdates);
```

### 13.3 Update activate-listeners.js vehicle handler

In `modules/character/activate-listeners.js`, the `.vehicle-select` change
handler (lines 124-139) also does auto-fill. Refactor to use a similar
pattern but for a single vehicle:

Create `modules/temporal-engine/apply-vehicle-reference-stats.js`:

```js
import { resolveVehicleStats } from '/systems/continuum-v2/modules/temporal-kernel/resolve-vehicle-stats.js';

/**
 * TEMPORAL ENGINE: APPLY VEHICLE REFERENCE STATS
 * Builds actor update data for a single vehicle name change.
 * @param {string} collectionKey - 'vehicles', 'airVehicles', or 'waterVehicles'.
 * @param {string} id - The vehicle row ID.
 * @param {string} vehicleName - The selected vehicle name.
 * @param {object} itemDataCatalog - The full ITEM_DATA object.
 * @returns {object} Updates to pass to actor.update().
 */
export function applyVehicleReferenceStats(collectionKey, id, vehicleName, itemDataCatalog) {
  const stats = resolveVehicleStats(vehicleName, itemDataCatalog);
  if (!stats) return { [`system.${collectionKey}.${id}.name`]: vehicleName };
  const updates = { [`system.${collectionKey}.${id}.name`]: vehicleName };
  for (const [stat, val] of Object.entries(stats)) {
    updates[`system.${collectionKey}.${id}.${stat}`] = val;
  }
  return updates;
}
```

Then in `activate-listeners.js`:
```js
import { applyVehicleReferenceStats } from '/systems/continuum-v2/modules/temporal-engine/apply-vehicle-reference-stats.js';
```

Replace the handler body:
```js
html.on('change', '.vehicle-select', async (ev) => {
    const fieldName = ev.currentTarget.name;
    const parts = fieldName.split('.');
    const collectionKey = parts[1];
    const id = parts[2];
    const vehicleName = ev.currentTarget.value;
    const updates = applyVehicleReferenceStats(collectionKey, id, vehicleName, ITEM_DATA);
    await sheet.actor.update(updates);
});
```

### 13.4 Verify

- `npm test`
- Create `tests/temporal-engine/apply-reference-stats.js`

---

## SECTION 14: Default Item Values (Schema)

**Current location:** `modules/character/item-add.js:5-67`
**Current location:** `modules/sheet-item-handlers.js:9-196`
**Current location:** `modules/character/event-add.js:4-31`
**Problem:** Default values for new items are hardcoded in UI click handlers.

### 14.1 Create State module

Create `modules/state/create-default-item.js`:

```js
/**
 * STATE: CREATE DEFAULT ITEM
 * Returns the default data object for a new item of the given type.
 * Used by item-add and event-add handlers instead of inline defaults.
 * @param {string} dataType - The item type (e.g., 'era', 'experience', 'goal').
 * @param {object} context - Context data (e.g., eraId, dob for era defaults).
 * @returns {object} Default data including generated id and sort.
 */
export function createDefaultItem(dataType, context = {}) {
  const newId = foundry.utils.randomID();
  const now = Date.now();
  const defaults = {
    era: {
      id: newId, name: 'New Era', age: 0,
      dateFrom: context.dob || '', dateTo: '',
      sort: now, experiences: {}, events: {}
    },
    experience: {
      id: newId, name: 'New Experience', sort: now, events: {}
    },
    goal: {
      id: newId, description: '', importance: 'Passing',
      condition: '', createdAt: now
    },
    favor: {
      id: newId, description: '', importance: 'Unimportant',
      when: '', createdAt: now
    },
    relationship: {
      id: newId, name: '', relationshipType: 'Acquaintance',
      importance: 'Social', when: '', where: ''
    },
    spanningAbility: {
      id: newId, name: '', description: '', value: 0
    },
    natSpanAbility: {
      id: newId, name: '', description: '', value: 0
    },
    metabilityApplication: {
      id: newId, name: '', description: '',
      level: 1, running: false,
      coercion: 0, creativity: 0, farsense: 0, pk: 0, redaction: 0
    },
    yetItem: {
      id: newId, description: '', done: false,
      frag: 0, date: '', time: ''
    },
    rangedWeapon: {
      id: newId, name: 'none', carried: true
    },
    meleeWeapon: {
      id: newId, name: 'none', carried: true
    },
    armor: {
      id: newId, name: 'none'
    },
    vehicle: {
      id: newId, name: 'none', mass: 0, ip: 0,
      armor: 0, passengers: 0
    },
    airVehicle: {
      id: newId, name: 'none', speedBlocks: 0,
      mass: 0, ip: 0, armor: 0, passengers: 0
    },
    waterVehicle: {
      id: newId, name: 'none', speedBlocks: 0,
      mass: 0, ip: 0, armor: 0, passengers: 0
    }
  };
  const data = defaults[dataType];
  if (!data) return null;
  return { id: newId, data, sort: now };
}
```

### 14.2 Update item-add.js

In `modules/character/item-add.js`, add import:
```js
import { createDefaultItem } from '/systems/continuum-v2/modules/state/create-default-item.js';
```

Refactor `handleCharacterItemAdd` to use:
```js
export async function handleCharacterItemAdd(sheet, event) {
    const button = event.target.closest('.item-add');
    if (!button) return;
    const dataType = button.dataset.type;
    const actor = sheet.actor;
    const context = {};
    if (dataType === 'era') {
        context.dob = normalizeDateInput(actor.system.personal?.dob || '');
    }
    const result = createDefaultItem(dataType, context);
    if (!result) return;
    const { id, data, sort } = result;
    let updates = {};
    // Map to correct DB path
    switch (dataType) {
        case 'era':
            updates[`system.eras.${id}`] = data;
            break;
        case 'experience':
            const eraId = button.dataset.eraId;
            if (eraId) updates[`system.eras.${eraId}.experiences.${id}`] = data;
            break;
        case 'event':
            // Event requires reindexing - keep existing logic
            // ... (event handling stays as-is for now)
            break;
        default:
            // Use a path convention
            const pathMap = {
                goal: 'system.goals',
                favor: 'system.favors',
                relationship: 'system.relationships',
                spanningAbility: 'system.spanning.abilities',
                natSpanAbility: 'system.spanning.natSpanAbilities',
                metabilityApplication: 'system.metabilities.applications',
                yetItem: 'system.theYet',
                rangedWeapon: 'system.combat.rangedWeapons',
                meleeWeapon: 'system.combat.meleeWeapons',
                armor: 'system.combat.armor',
                vehicle: 'system.vehicles'
            };
            if (pathMap[dataType]) updates[`${pathMap[dataType]}.${id}`] = data;
    }
    if (Object.keys(updates).length > 0) await actor.update(updates);
}
```

### 14.3 Verify

- `npm test`
- Create `tests/state/create-default-item.js`:
  - Each type returns an object with id, data, sort
  - Era includes dob from context
  - Unknown type returns null

---

## SECTION 15: Spinner Value Resolution (resolveSpinnerUpdate)

**Current location:** `modules/sheet-spinners.js:231-304`
**Problem:** The spinner onPointerUp handler contains 70+ lines of:
  - Mapping attribute name to update path
  - Clamping temp values to perm
  - Clamping metability values to potential
  - Sending cascading actor updates

### 15.1 Create Kernel function

Create `modules/temporal-kernel/resolve-spinner-update.js`:

```js
import { clampTempToPerm } from '/systems/continuum-v2/modules/temporal-kernel/clamp-temp-to-perm.js';
import { clampValueToPotential } from '/systems/continuum-v2/modules/temporal-kernel/clamp-value-to-potential.js';

/**
 * TEMPORAL KERNEL: RESOLVE SPINNER UPDATE
 * Given an attribute name and proposed new value, returns the final value
 * and any cascading updates needed (e.g., temp clamped when perm changes).
 * @param {string} attributeName - The spinner's data-attribute value.
 * @param {number} proposedValue - The user's desired new value.
 * @param {object} actorData - The actor's system data (for reading perm/potential).
 * @returns {{ finalValue: number, updatePath: string, cascadedUpdates: object }}
 *   cascadedUpdates is { [dotPath]: value } for side-effects.
 */
export function resolveSpinnerUpdate(attributeName, proposedValue, actorData) {
  const result = { finalValue: proposedValue, updatePath: '', cascadedUpdates: {} };

  // Metability spinners
  if (attributeName.startsWith('meta-')) {
    const metaName = attributeName.substring(5);
    const potential = Number(actorData.metabilities?.[metaName]?.potential) ?? 5;
    result.finalValue = clampValueToPotential(proposedValue, potential);
    result.updatePath = `system.metabilities.${metaName}.value`;
    return result;
  }

  // temp/perm pairs
  if (attributeName === 'willpowerTemp') {
    const permWill = Number(actorData.attributes?.willpower?.perm) || 0;
    result.finalValue = clampTempToPerm(proposedValue, permWill);
    result.updatePath = 'system.attributes.willpower.temp';
    return result;
  }
  if (attributeName === 'willpowerPerm') {
    result.finalValue = proposedValue;
    result.updatePath = 'system.attributes.willpower.perm';
    const curTemp = Number(actorData.attributes?.willpower?.temp) || 0;
    const clampedTemp = clampTempToPerm(curTemp, proposedValue);
    if (clampedTemp !== curTemp) {
      result.cascadedUpdates['system.attributes.willpower.temp'] = clampedTemp;
    }
    return result;
  }
  if (attributeName === 'internalReputationTemp') {
    const permIR = Number(actorData.attributes?.internalReputation?.perm) || 0;
    result.finalValue = clampTempToPerm(proposedValue, permIR);
    result.updatePath = 'system.attributes.internalReputation.temp';
    return result;
  }
  if (attributeName === 'internalReputationPerm') {
    result.finalValue = proposedValue;
    result.updatePath = 'system.attributes.internalReputation.perm';
    const curTemp = Number(actorData.attributes?.internalReputation?.temp) || 0;
    const clampedTemp = clampTempToPerm(curTemp, proposedValue);
    if (clampedTemp !== curTemp) {
      result.cascadedUpdates['system.attributes.internalReputation.temp'] = clampedTemp;
    }
    return result;
  }
  if (attributeName === 'externalReputationTemp') {
    const permER = Number(actorData.attributes?.externalReputation?.perm) || 0;
    result.finalValue = clampTempToPerm(proposedValue, permER);
    result.updatePath = 'system.attributes.externalReputation.temp';
    return result;
  }
  if (attributeName === 'externalReputationPerm') {
    result.finalValue = proposedValue;
    result.updatePath = 'system.attributes.externalReputation.perm';
    const curTemp = Number(actorData.attributes?.externalReputation?.temp) || 0;
    const clampedTemp = clampTempToPerm(curTemp, proposedValue);
    if (clampedTemp !== curTemp) {
      result.cascadedUpdates['system.attributes.externalReputation.temp'] = clampedTemp;
    }
    return result;
  }

  // Spanning fields
  if (['span', 'naturalSpan', 'deliberateFrag', 'naturalFrag'].includes(attributeName)) {
    result.finalValue = proposedValue;
    result.updatePath = `system.spanning.${attributeName}`;
    return result;
  }

  // Wound fields
  if (attributeName.startsWith('wound-')) {
    const key = attributeName.split('-')[1];
    result.finalValue = proposedValue;
    result.updatePath = `system.combat.wounds.${key}.ip`;
    return result;
  }

  // Regular attributes
  result.finalValue = proposedValue;
  result.updatePath = `system.attributes.${attributeName}.value`;
  return result;
}
```

### 15.2 Update sheet-spinners.js

In `modules/sheet-spinners.js`, add import:
```js
import { resolveSpinnerUpdate } from '/systems/continuum-v2/modules/temporal-kernel/resolve-spinner-update.js';
```

In the `onPointerUp` handler (around line 231), replace the value derivation
and path mapping block with:
```js
const resolved = resolveSpinnerUpdate(
  attributeName, newValue, sheet.actor.system
);
newValue = resolved.finalValue;
const updatePath = resolved.updatePath;

// Apply cascade updates from Kernel
if (Object.keys(resolved.cascadedUpdates).length > 0) {
  sheet.actor.update(resolved.cascadedUpdates);
  // Update paired spinner visual positions
  for (const [cascadePath, cascadeValue] of Object.entries(resolved.cascadedUpdates)) {
    if (cascadePath.includes('.temp')) {
      const cascadeAttr = cascadePath.split('.').pop().replace('temp', 'Temp');
      const prefix = cascadePath.includes('internalReputation') ? 'internalReputation' :
                     cascadePath.includes('externalReputation') ? 'externalReputation' :
                     'willpower';
      const cascadeAttrName = prefix + 'Temp';
      const cascadeIdx = 10 - cascadeValue;
      const cascadeImg = html.find(`.attribute-spinner-viewport[data-attribute="${cascadeAttrName}"] .attribute-spinner-image`);
      if (cascadeImg.length) {
        cascadeImg.css('top', `${snapOffsets[cascadeIdx]}px`);
      }
    }
  }
}
```

### 15.3 Verify

- `npm test`
- Create `tests/temporal-kernel/resolve-spinner-update.js`:
  - 'body', 7 -> { finalValue: 7, updatePath: 'system.attributes.body.value', cascadedUpdates: {} }
  - 'willpowerTemp', 8 when perm=5 -> { finalValue: 5, ... }
  - 'willpowerPerm', 3 when temp=5 -> cascadedUpdates includes willpower.temp = 3
  - 'span', 2 -> { finalValue: 2, updatePath: 'system.spanning.span' }
  - 'wound-head', 4 -> { finalValue: 4, updatePath: 'system.combat.wounds.head.ip' }

---

## SECTION 16: Roll Total Calculation

**Current location:** `modules/lifeline/controllers/roll-dialog/execute-situation-roll.js:69`
**Problem:** `Math.floor(base + bonus + appBonus + sitMod + benefitBonus + gearBonus + abilityBonus)`
inline in the roll executor.

### 16.1 Create Kernel function

Create `modules/temporal-kernel/calculate-roll-total.js`:

```js
/**
 * TEMPORAL KERNEL: CALCULATE ROLL TOTAL
 * Sums all contributing factors to a dice roll target number.
 * @param {object} params
 * @param {number} params.base - Base attribute value (after wound penalties).
 * @param {number} params.pushBonus - Metability push or speed modifier.
 * @param {number} params.appBonus - Application level bonus.
 * @param {number} params.sitMod - Situational modifier from slider/input.
 * @param {number} params.benefitBonus - Toggled benefit bonus total.
 * @param {number} params.gearBonus - Gear item computed bonus.
 * @param {number} params.abilityBonus - Spanning ability bonus.
 * @returns {number} Final target number (floored integer).
 */
export function calculateRollTotal({ base, pushBonus = 0, appBonus = 0, sitMod = 0, benefitBonus = 0, gearBonus = 0, abilityBonus = 0 }) {
  return Math.floor(base + pushBonus + appBonus + sitMod + benefitBonus + gearBonus + abilityBonus);
}
```

### 16.2 Update execute-situation-roll.js

In the roll executor, add import:
```js
import { calculateRollTotal } from '/systems/continuum-v2/modules/temporal-kernel/calculate-roll-total.js';
```

Replace line 69:
```js
const total = Math.floor(base + bonus + appBonus + sitMod + benefitBonus + gearBonus + abilityBonus);
```
With:
```js
const total = calculateRollTotal({
    base, pushBonus: bonus, appBonus, sitMod,
    benefitBonus, gearBonus, abilityBonus
});
```

### 16.3 Verify

- `npm test`
- Create `tests/temporal-kernel/calculate-roll-total.js`:
  - All zeros -> 0
  - base: 5, sitMod: 2 -> 7
  - Mixed inputs with fractions -> floor applied

---

## SECTION 17: Move Drag Mode Classification to Kernel

**Current location:** `modules/lifeline/services/drag-math/get-drag-mode.js`
**Problem:** Angle thresholds for classifying span vs level drag are game
physics rules living in the lifeline UI services.

### 17.1 Copy to Kernel

Create `modules/temporal-kernel/classify-drag-mode.js`:

```js
/**
 * TEMPORAL KERNEL: CLASSIFY DRAG MODE
 * Determines whether a pointer drag constitutes a Span (vertical)
 * or a Level (diagonal) based on Continuum physics.
 * Game rules:
 * - No leftward movement allowed.
 * - Angle steeper than 60 degrees = Span.
 * - Angle between 15-45 degrees (up-right) = Level.
 * @param {number} dx - Screen delta X (positive = right).
 * @param {number} dy - Screen delta Y (negative = up).
 * @returns {'span'|'level'|null} The classified drag mode, or null if invalid.
 */
export function classifyDragMode(dx, dy) {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (dx < -2) return null;
  if (absY > absX * 1.73) return 'span';
  if (dx > 2 && dy < 0) {
    const slope = Math.abs(dy) / dx;
    if (slope > 0.2 && slope < 1.2) return 'level';
  }
  return null;
}
```

### 17.2 Update lifeline adapter

In `modules/lifeline/services/drag-math/get-drag-mode.js`:
```js
export { classifyDragMode as getDragMode } from '/systems/continuum-v2/modules/temporal-kernel/classify-drag-mode.js';
```

### 17.3 Verify

- `npm test`
- Create `tests/temporal-kernel/classify-drag-mode.js`:
  - Pure vertical up -> 'span'
  - 30-degree diagonal -> 'level'
  - Leftward -> null
  - Small movement -> null

---

## SECTION 18: Primary Location (Tooltip Service)

**Current location:** `modules/lifeline/services/ui/experience-tooltip-service.js:34-53`
**Problem:** Mode calculation (most common location from events) is a
statistical aggregation in a tooltip service.

### 18.1 Create Kernel function

Create `modules/temporal-kernel/get-primary-location.js`:

```js
/**
 * TEMPORAL KERNEL: GET PRIMARY LOCATION
 * Returns the most common location from a list of event locations.
 * Used by the experience tooltip and any other location aggregation.
 * @param {object[]} events - Array of event objects with location/spanFromLocation.
 * @returns {string} The most common location, or 'Unknown' if none.
 */
export function getPrimaryLocation(events) {
  const locations = events
    .map(e => e.eventIsSpan ? e.eventSpanFromLocation : e.location)
    .filter(l => typeof l === 'string' && l.trim() !== '');
  if (locations.length === 0) return 'Unknown';
  const counts = {};
  let maxCount = 0;
  let mode = 'Unknown';
  for (const loc of locations) {
    const clean = loc.trim();
    counts[clean] = (counts[clean] || 0) + 1;
    if (counts[clean] > maxCount) {
      maxCount = counts[clean];
      mode = clean;
    }
  }
  return mode;
}
```

### 18.2 Update tooltip service

In `experience-tooltip-service.js`, add import:
```js
import { getPrimaryLocation } from '/systems/continuum-v2/modules/temporal-kernel/get-primary-location.js';
```

Replace lines 34-53 (the location extraction + mode calculation) with:
```js
const primaryLocation = getPrimaryLocation(Object.values(expData.events || {}));
```

### 18.3 Verify

- `npm test`
- Create `tests/temporal-kernel/get-primary-location.js`:
  - Empty events -> 'Unknown'
  - All same location -> that location
  - Mixed locations -> most common one

---

## SECTION 19: End of Rest Computation

**Current location:** `modules/lifeline/services/ui/handle-rest-toggle.js:24-83`
**Problem:** `createEndOfRestEvent` computes 24h-forward age/timestamp inline.
The function also reads actor data directly. The rule (rest = +24h subjective)
should be in Kernel, the actor data reads in Engine, the routing in State.

### 19.1 Create Kernel function

Create `modules/temporal-kernel/compute-end-of-rest.js`:

```js
import { SECONDS_IN_DAY, MS_PER_SECOND } from '/systems/continuum-v2/modules/temporal-engine/constants.js';

/**
 * TEMPORAL KERNEL: COMPUTE END OF REST
 * Pure function: given a rest event's age/timestamp, computes the
 * end-of-rest event's age and timestamp.
 * Game rule: rest is 1:1 subjective progression, so +24 hours.
 * @param {number} sourceAge - Source event subjective age in seconds.
 * @param {number} sourceTs - Source event objective timestamp in ms.
 * @returns {{ endAge: number, endTs: number }} End-of-rest values.
 */
export function computeEndOfRest(sourceAge, sourceTs) {
  return {
    endAge: sourceAge + SECONDS_IN_DAY,
    endTs: sourceTs + (SECONDS_IN_DAY * MS_PER_SECOND)
  };
}
```

### 19.2 Update handle-rest-toggle.js

In `handle-rest-toggle.js`, add import and replace the inline computation:

```js
import { computeEndOfRest } from '/systems/continuum-v2/modules/temporal-kernel/compute-end-of-rest.js';
```

Replace lines 28-47:
```js
const sourceAge = parseSubjectiveAge(sourceEvent.eventAge);
const endAge = sourceAge + SECONDS_IN_DAY;
// ... (complex startTs derivation) ...
const endTs = startTs + (SECONDS_IN_DAY * MS_PER_SECOND);
```
With:
```js
const sourceAge = parseSubjectiveAge(sourceEvent.eventAge);
// Derive startTs (keep existing logic for finding computed timestamp)
let startTs = Number(sourceEvent.ts);
if (!startTs) {
    startTs = findComputedTimestamp(actor, eraId, expId, sourceAge);
}
if (!startTs) {
    const startDate = sourceEvent.eventSpanFromDate || sourceEvent.eventDate || sourceEvent.date;
    const startTime = sourceEvent.eventSpanFromTime || sourceEvent.eventTime || sourceEvent.time || '12:00:00';
    const history = getActorHistory(actor);
    const context = resolveLocationContext(history, sourceAge, actor);
    startTs = parseObjectiveTime(startDate, startTime, context) || 0;
}
const { endAge, endTs } = computeEndOfRest(sourceAge, startTs);
```

Remove the `SECONDS_IN_DAY` and `MS_PER_SECOND` imports if no longer used
directly in this file (they are used by `computeEndOfRest` now).

### 19.3 Verify

- `npm test`
- Create `tests/temporal-kernel/compute-end-of-rest.js`:
  - sourceAge=0, sourceTs=0 -> { endAge: 86400, endTs: 86400000 }
  - sourceAge=31536000, sourceTs=Date.now() -> endAge = sourceAge + 86400

---

## SECTION 20: Spinner Constants Centralization

**Current location:** `modules/sheet-spinners.js:17-39`
**Current location:** `modules/character/initialize-app-spinners.js:16-38`
**Problem:** Hardcoded pixel offsets duplicated across spinner files.

### 20.1 Create constants module

Create `modules/span-graph/constants/spinner-offsets.js`:

```js
/**
 * PROJECTOR: SPINNER OFFSETS
 * Pixel offsets for all spinner types on the character sheet.
 * Single source of truth for frame alignment.
 */

const BASE_OFFSET = 5;

// Regular attribute spinners: 80px frame height, 11 frames (0-10)
export const REGULAR_ATTR_SNAP_OFFSETS = Array.from(
  { length: 11 }, (_, i) => Math.round((-i * 80) + BASE_OFFSET)
);

// Compact attribute spinners (willpower): 50px frame height
export const COMPACT_ATTR_SNAP_OFFSETS = Array.from(
  { length: 11 }, (_, i) => Math.round((-i * 50) + BASE_OFFSET)
);

// Wound spinners: 34px frame height
export const WOUND_SNAP_OFFSETS = Array.from(
  { length: 11 }, (_, i) => Math.round((-i * 34) + BASE_OFFSET)
);

// Metability spinners: 6 frames at 80px each
export const METABILITY_SNAP_OFFSETS = [0, -80, -160, -240, -320, -400];

// Operant potential background: 143px per frame
export const POTENTIAL_BG_OFFSETS = [0, -143, -286, -429, -572, -715];

// Application ingredient spinners: 30px viewport height
const ING_H = 30;
const VP = 36;
export const INGREDIENT_SNAP_OFFSETS = [0, -1, -2, -3, -4, -5].map(
  i => i * ING_H
);

// Application level spinners: 36px viewport height
export const APP_LEVEL_OFFSETS = [
  Math.round(-(9 * VP)),
  Math.round(-(8 * VP)),
  Math.round(-(7 * VP))
];
export const APP_LEVEL_VALUES = [1, 2, 3];

// Ability spinners (span/nat-span): 36px viewport height
export const ABILITY_OFFSETS = [
  Math.round(-(10 * VP)),
  Math.round(-(9 * VP)),
  Math.round(-(8 * VP)),
  Math.round(-(7 * VP))
];
export const ABILITY_VALUES = [0, 1, 2, 3];
```

### 20.2 Update sheet-spinners.js

Replace the inline constant definitions with imports:
```js
import {
  REGULAR_ATTR_SNAP_OFFSETS, COMPACT_ATTR_SNAP_OFFSETS,
  WOUND_SNAP_OFFSETS, METABILITY_SNAP_OFFSETS,
  POTENTIAL_BG_OFFSETS
} from '/systems/continuum-v2/modules/span-graph/constants/spinner-offsets.js';
```

Remove the original inline definitions (lines 17-39).

Update the rep spinner offset to compute dynamically as it already does
(relying on `clientHeight`).

### 20.3 Update initialize-app-spinners.js

Replace inline constants with imports from the same module:
```js
import {
  INGREDIENT_SNAP_OFFSETS, APP_LEVEL_OFFSETS, APP_LEVEL_VALUES,
  ABILITY_OFFSETS, ABILITY_VALUES
} from '/systems/continuum-v2/modules/span-graph/constants/spinner-offsets.js';
```

Remove the original inline definitions (lines 16-38).

### 20.4 Verify

- `npm test`
- Manual: open character sheet, drag each spinner type, verify snapping works
- All spinner positions should be pixel-identical to before

---

## COMPLETION CHECKLIST

After all sections are complete:

- [ ] Section 1: React Penalty Formula
- [ ] Section 2: Calculated Age Formatting
- [ ] Section 3: Resonance Bonus Classification
- [ ] Section 4: Application Highest Rank
- [ ] Section 5: isDeletable Template Helper
- [ ] Section 6: metaLabel Template Helper
- [ ] Section 7: Unit Tier Extraction
- [ ] Section 8: Move Lifeline Rule Calculators to Kernel
- [ ] Section 9: Deduplicate _calculateArmorSummary
- [ ] Section 10: Flatten Actor History
- [ ] Section 11: Flatten Collection Utility
- [ ] Section 12: Date Normalization in _updateObject
- [ ] Section 13: Combat/Vehicle Auto-Fill
- [ ] Section 14: Default Item Values
- [ ] Section 15: Spinner Value Resolution
- [ ] Section 16: Roll Total Calculation
- [ ] Section 17: Drag Mode Classification
- [ ] Section 18: Primary Location
- [ ] Section 19: End of Rest Computation
- [ ] Section 20: Spinner Constants Centralization

Run `npm test` after EVERY section. Zero failures before moving on.