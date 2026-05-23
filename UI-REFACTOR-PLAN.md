# UI Refactor Plan: Moving Business Logic from UI to Kernel/TTL

This document lays out step-by-step plans for extracting business logic from the
character sheet UI code and placing it in the Kernel (rules) or TTL (translation)
layers. Each section is self-contained so a new dev session can pick it up and
execute it independently.

---

## Principles

1. **Kernel functions are pure** - they take data in, return data out, no DOM, no
   Foundry API, no side effects.
2. **TTL functions are pure** - they translate between human-readable strings and
   atomic integers.
3. **UI code calls kernel/TTL** - the UI reads the result and renders it. It never
   computes a game rule or translates a unit itself.
4. **One function per file** - every extracted function gets its own file under
   `modules/temporal-kernel/` or `modules/temporal-translator/`.
5. **Imports use absolute paths** - `/systems/continuum-v2/modules/...`.
6. **Tests first** - write a test for each extracted function before (or alongside)
   the extraction. All existing tests must continue to pass.
7. **No behavioral change** - the refactor must produce identical UI output. If the
   old code and new code differ in rounding or clamping, that is a bug in the plan,
   not an acceptable divergence.

---

## Section 1: Personal Information

### P1: `resourceState` Handlebars Helper (Org Visibility Rule)

**Current location:** `continuum.js:24-35`

**What it does:** Reads `system.attributes.externalReputation.value`, extracts a
numeric tier from a size string (e.g. "Tier 3" -> 3), compares tier vs reputation,
and returns a "Gated" badge if tier > reputation. This is an organization rule
leaking into a global Handlebars registration inside the character sheet init.

**Kernel function:** `modules/temporal-kernel/is-unit-gated.js`

```js
/**
 * Determines whether a unit is gated by External Reputation.
 * Pure rule: unitTier > externalReputation means the unit is inaccessible.
 * @param {number} unitTier - The tier number extracted from the unit's size.
 * @param {number} externalReputation - The org's External Reputation value.
 * @returns {boolean} True if the unit is gated.
 */
export function isUnitGated(unitTier, externalReputation) {
    return unitTier > externalReputation;
}
```

**Steps:**
1. Create `modules/temporal-kernel/is-unit-gated.js` with the function above.
2. Write test `tests/temporal-kernel/is-unit-gated.test.js`:
   - `isUnitGated(3, 2)` -> true
   - `isUnitGated(2, 3)` -> false
   - `isUnitGated(3, 3)` -> false (tier equals rep is NOT gated)
   - `isUnitGated(0, 0)` -> false
3. Refactor the Handlebars helper in `continuum.js:24-35` to import and call
   `isUnitGated`. The helper still extracts the tier from the size string (that's
   presentation logic) and passes the two numbers to the kernel.
4. Run `npm test` to verify.

**Risk:** Low. The rule is simple and currently only used in one Handlebars helper.

---

### P2: Date Field Regex in `_updateObject`

**Current location:** `continuum.js:104-106`

**What it does:** A regex `/(date|dob|when|inceptionDate|dateofbirth)$/i` matches
form field names and normalizes their values via `normalizeDateInput()`. This is
a TTL concern (normalizing a date string) but the *list of which fields are dates*
is a schema concern currently hardcoded in the UI.

**TTL function:** `modules/temporal-translator/date-field-registry.js`

```js
/**
 * Registry of system paths that represent date fields.
 * Used by _updateObject to know which form values need date normalization.
 * @returns {string[]} Array of path suffixes that are dates.
 */
export const DATE_FIELD_SUFFIXES = ['date', 'dob', 'when', 'inceptionDate', 'dateofbirth'];

/**
 * Tests whether a form field name refers to a date field.
 * @param {string} fieldName - The form field's name attribute.
 * @returns {boolean} True if the field should be date-normalized.
 */
export function isDateField(fieldName) {
    const suffixes = DATE_FIELD_SUFFIXES;
    return suffixes.some(s => fieldName.toLowerCase().endsWith(s.toLowerCase()));
}
```

**Steps:**
1. Create `modules/temporal-translator/date-field-registry.js` with the constants
   and function above.
2. Write test `tests/temporal-translator/date-field-registry.test.js`:
   - `isDateField('system.personal.dob')` -> true
   - `isDateField('system.eras.abc.dateFrom')` -> true (ends with... wait, "From"
     is not in the list, but "dateFrom" doesn't end with "date". Need to check
     actual regex: `/(date|dob|when|inceptionDate|dateofbirth)$/i`. "dateFrom"
     does NOT match. Verify what fields actually need this.)
   - Test each suffix works.
   - Test non-date fields return false: `isDateField('system.personal.name')` -> false
3. Update `continuum.js:104-106` to import `isDateField` and replace the regex:
   ```js
   // OLD:
   if (typeof value === 'string' && /(date|dob|when|inceptionDate|dateofbirth)$/i.test(key)) {
   // NEW:
   if (typeof value === 'string' && isDateField(key)) {
   ```
4. Run `npm test`.

**Risk:** Low-medium. Must verify the regex behavior matches exactly. The current
regex uses `$` anchoring so "dateFrom" would NOT match. The new function must
replicate this exactly - match against the END of the string only.

---

### P3: Name Sync in `_updateObject`

**Current location:** `continuum.js:109-112`

**What it does:** When `formData.name` is present, sets `formData['system.personal.name']`
to the same value, keeping the Foundry document name and the nested system field in
sync. This is a database consistency rule - the UI should not be responsible for
maintaining data invariants.

**State function:** `modules/state/sync-actor-name.js`

```js
/**
 * Ensures the nested system.personal.name matches the document-level name.
 * This is a DB invariant: the two must always be identical after form submission.
 * @param {object} formData - The flat form data object from _updateObject.
 * @returns {object} The same formData object, with system.personal.name synced.
 */
export function syncActorName(formData) {
    if (formData.name) {
        formData['system.personal.name'] = formData.name;
    }
    return formData;
}
```

**Steps:**
1. Create `modules/state/sync-actor-name.js` with the function above.
2. Write test `tests/state/sync-actor-name.test.js`:
   - With `formData.name = 'Alice'` -> `formData['system.personal.name']` === 'Alice'
   - Without `formData.name` -> `formData['system.personal.name']` is undefined
   - Returns the same object reference
3. Update `continuum.js:109-112`:
   ```js
   // OLD:
   if (formData.name) {
       formData['system.personal.name'] = formData.name;
   }
   // NEW:
   syncActorName(formData);
   ```
4. Import: `import { syncActorName } from './modules/state/sync-actor-name.js';`
5. Run `npm test`.

**Risk:** Very low. Simple assignment, no conditional complexity.

---

### P4: `ASPECT_LABELS` Constant Deduplication

**Current location:** Duplicated in three files:
- `modules/character/prepare-data.js:10-14`
- `modules/lifeline/controllers/roll-dialog/setup-roll-buttons.js:9-12`
- `item-sheet.js:4-8`

**What it does:** Maps gear type strings ('firearm', 'technology', 'tool', 'vehicle')
to human-readable aspect label objects. This is reference data used purely for
display but it's a domain constant that should live in one canonical place.

**Kernel constant:** `modules/temporal-kernel/gear-aspect-labels.js`

```js
/**
 * Canonical mapping of gear types to their aspect labels.
 * Used for display in gear sheets, roll dialogs, and character sheet preparation.
 * Single source of truth - all UI code imports from here.
 */
export const GEAR_ASPECT_LABELS = {
    firearm: { aspect1: 'Handling', aspect2: 'Ammo', aspect3: 'Reliability' },
    technology: { aspect1: 'Speed', aspect2: 'Capacity', aspect3: 'Connectivity' },
    tool: { aspect1: 'Quality', aspect2: 'Versatility', aspect3: 'Durability' },
    vehicle: { aspect1: 'Handling', aspect2: 'Acceleration', aspect3: 'Prestige' }
};
```

**Steps:**
1. Create `modules/temporal-kernel/gear-aspect-labels.js` with the constant above.
2. Write test `tests/temporal-kernel/gear-aspect-labels.test.js`:
   - Verify all 4 gear types exist.
   - Verify each has aspect1, aspect2, aspect3 strings.
   - Verify no extra keys (future-proofing: if someone adds a gear type, the test
     should still pass but catch accidental removal).
3. Update `modules/character/prepare-data.js:2-14`:
   - Remove lines 10-14 (the local `ASPECT_LABELS` constant).
   - Add import: `import { GEAR_ASPECT_LABELS } from '/systems/continuum-v2/modules/temporal-kernel/gear-aspect-labels.js';`
   - Change `ASPECT_LABELS[gt]` to `GEAR_ASPECT_LABELS[gt]` (lines 122 and any other refs).
4. Update `modules/lifeline/controllers/roll-dialog/setup-roll-buttons.js:1-12`:
   - Remove lines 9-12 (the local `ASPECT_LABELS` constant).
   - Add import: `import { GEAR_ASPECT_LABELS } from '/systems/continuum-v2/modules/temporal-kernel/gear-aspect-labels.js';`
   - This file doesn't currently reference ASPECT_LABELS after defining it
     (it was dead code or used elsewhere). Check and remove if unused.
5. Update `item-sheet.js:1-8`:
   - Remove lines 4-8 (the local `ASPECT_LABELS` constant).
   - Add import: `import { GEAR_ASPECT_LABELS } from '/systems/continuum-v2/modules/temporal-kernel/gear-aspect-labels.js';`
   - Change `ASPECT_LABELS[gearType]` to `GEAR_ASPECT_LABELS[gearType]` (line 55).
6. Run `npm test`.

**Risk:** Low. Pure constant relocation. Must verify all 3 files still resolve the
same labels.

---

### P5: `fraternityClass` CSS Class Generation

**Current location:** `modules/character/prepare-data.js:102`

**What it does:** `(system.personal.fraternity || "default-fraternity").toLowerCase().replace(/\s+/g, '-')`
- Converts a fraternity name like "Money Changers" into a CSS class name
  "money-changers". This is purely presentational (CSS class from data).

**Decision:** This is **purely a projector concern** - generating a CSS class name
from a data value. It does NOT need to move to the kernel. The normalization rule
(lowercase, spaces to hyphens) is a CSS convention, not a game rule.

However, the same normalization is used in `sheet-data-preparation.js:83` with a
slightly different implementation (missing the `\s+` -> `-` replacement). This
inconsistency should be fixed.

**Utility function:** `modules/character/css-class-from-fraternity.js`

```js
/**
 * Converts a fraternity name to a CSS-safe class name.
 * "Money Changers" -> "money-changers", "Foxhorn" -> "foxhorn".
 * This is a presentation utility, not a game rule.
 * @param {string} fraternityName - The fraternity name from system data.
 * @returns {string} CSS-safe class string.
 */
export function cssClassFromFraternity(fraternityName) {
    return (fraternityName || 'default-fraternity').toLowerCase().replace(/\s+/g, '-');
}
```

**Steps:**
1. Create `modules/character/css-class-from-fraternity.js` with the function above.
2. Write test (in `tests/character/css-class-from-fraternity.test.js` or similar):
   - `"Foxhorn"` -> `"foxhorn"`
   - `"Money Changers"` -> `"money-changers"`
   - `""` -> `"default-fraternity"`
   - `null` -> `"default-fraternity"`
   - `"  "` -> `"default-fraternity"` (whitespace-only)
3. Update `modules/character/prepare-data.js:102`:
   - Import `cssClassFromFraternity`.
   - Replace: `context.fraternityClass = cssClassFromFraternity(context.system.personal?.fraternity);`
4. Update `modules/sheet-data-preparation.js:83`:
   - Import `cssClassFromFraternity`.
   - Replace: `context.fraternityClass = cssClassFromFraternity(context.system.personal?.fraternity);`
   - This also fixes the inconsistency where sheet-data-preparation was missing
     the `.replace(/\s+/g, '-')` call.
5. Run `npm test`.

**Risk:** Very low. The function is deterministic and has no side effects.

---

## Section 2: Attributes

### A1+A2: Temp <= Perm Clamping (Willpower & Reputation)

**Current location:** `modules/sheet-spinners.js:168-194` (drag) and
`sheet-spinners.js:225-239` (release)

**What it does:** During and after spinner drag, enforces the rule that temporary
willpower/reputation cannot exceed permanent willpower/reputation. Currently this
is done by directly reading actor data and visually forcing the temp spinner down.

**Kernel function:** `modules/temporal-kernel/clamp-temp-to-perm.js`

```js
/**
 * Clamps a temporary attribute value so it does not exceed its permanent counterpart.
 * Game rule: Temp Will, Temp IR, and Temp ER can never exceed their Perm values.
 * @param {number} tempValue - The proposed temporary value.
 * @param {number} permValue - The current permanent value (upper bound).
 * @returns {number} The clamped temporary value.
 */
export function clampTempToPerm(tempValue, permValue) {
    return Math.min(tempValue, permValue);
}
```

**Steps:**
1. Create `modules/temporal-kernel/clamp-temp-to-perm.js`.
2. Write test `tests/temporal-kernel/clamp-temp-to-perm.test.js`:
   - `clampTempToPerm(5, 7)` -> 5 (within bounds, unchanged)
   - `clampTempToPerm(8, 5)` -> 5 (exceeds perm, clamped)
   - `clampTempToPerm(0, 5)` -> 0
   - `clampTempToPerm(5, 0)` -> 0
   - `clampTempToPerm(-1, 5)` -> -1 (negative handling: min(-1, 5) = -1)
3. Update `sheet-spinners.js` lines 168-194 (onMove) to use `clampTempToPerm`:
   - Import the function.
   - Replace inline `if (newPermValue < currentTempWill)` logic with a call to
     `clampTempToPerm(currentTemp, newPermValue)` to get the clamped value.
   - The visual update (moving the spinner image) stays in the UI.
4. Update `sheet-spinners.js` lines 225-239 (onUp) to use `clampTempToPerm`:
   - Replace inline `if (newValue > permWill)` / `if (newValue > permIR)` /
     `if (newValue > permER)` with `clampTempToPerm(newValue, permValue)`.
5. The cascading actor.update calls (lines 270, 276) that auto-reduce temp when
   perm drops below it: replace with `clampTempToPerm` as well.
6. Run `npm test`.

---

### A3: Operant Potential Cap on Metability Value

**Current location:** `modules/sheet-spinners.js:246-252`

**What it does:** `if (newValue > potential) { newValue = potential; }` - a
metability's current rank cannot exceed its operant potential.

**Kernel function:** `modules/temporal-kernel/clamp-value-to-potential.js`

```js
/**
 * Clamps a metability value so it does not exceed its operant potential.
 * Game rule: Current metability rank cannot exceed the operant potential ceiling.
 * @param {number} value - The proposed metability rank.
 * @param {number} potential - The operant potential (upper bound).
 * @returns {number} The clamped metability rank.
 */
export function clampValueToPotential(value, potential) {
    return Math.min(value, potential);
}
```

**Steps:**
1. Create `modules/temporal-kernel/clamp-value-to-potential.js`.
2. Write test `tests/temporal-kernel/clamp-value-to-potential.test.js`:
   - `clampValueToPotential(3, 5)` -> 3
   - `clampValueToPotential(5, 3)` -> 3
   - `clampValueToPotential(0, 5)` -> 0
   - `clampValueToPotential(5, 0)` -> 0
3. Update `sheet-spinners.js:246-252` to use `clampValueToPotential`.
4. Update `sheet-spinners.js:426-428` (potential drag handler, same rule) to use
   `clampValueToPotential`.
5. Run `npm test`.

---

### A5: Armor Summary Calculation (Duplicate of Kernel)

**Current location:** `modules/character/prepare-data.js:50-77`
(`_calculateArmorSummary`)

**What it does:** Sums IP columns, computes total encumbrance, calculates
quickPenalty. This is nearly identical to `calculate-quick-penalty.js` in the
kernel, but also produces total IP breakdowns per body location for the hit
diagram display.

**Kernel functions:**

1. `modules/temporal-kernel/calculate-armor-ip-totals.js`:

```js
/**
 * Sums armor protection values across all equipped armor items per body location.
 * @param {object[]} armorItems - Array of armor item objects with ipA..ipG fields.
 * @returns {object} Totals: { totalIpA, totalIpB, ..., totalIpG }
 */
export function calculateArmorIpTotals(armorItems) { ... }
```

2. `modules/temporal-kernel/calculate-total-encumbrance.js`:

```js
/**
 * Computes total encumbrance: armor + carried gear + carried weapons.
 * @param {object[]} armorItems - Armor item objects.
 * @param {object[]} rangedWeapons - Ranged weapon objects.
 * @param {object[]} meleeWeapons - Melee weapon objects.
 * @param {number} totalGearWeight - Total weight of carried gear items (pre-computed).
 * @param {object} armorItemData - ITEM_DATA.armor lookup.
 * @param {object} rangedWeaponItemData - ITEM_DATA.rangedWeapons lookup.
 * @param {object} meleeWeaponItemData - ITEM_DATA.meleeWeapons lookup.
 * @returns {number} Total encumbrance (floored integer).
 */
export function calculateTotalEncumbrance(armorItems, rangedWeapons, meleeWeapons, totalGearWeight, armorItemData, rangedWeaponItemData, meleeWeaponItemData) { ... }
```

**Steps:**
1. Create both kernel functions.
2. Write tests for each.
3. Update `_calculateArmorSummary` in `prepare-data.js` to call these kernel
   functions instead of doing its own math.
4. Verify the `calculate-quick-penalty.js` kernel function already handles
   encumbrance correctly - if so, consider having `calculateTotalEncumbrance`
   share code with it.
5. Run `npm test`.

---

### A6: Wounds Summary Computation

**Current location:** `modules/character/prepare-data.js:206-209`

**What it does:** `ipTotal = sum(wound.ip)`, `ipRemaining = (body * 3) - totalIP`

**Kernel function:** `modules/temporal-kernel/calculate-wound-capacity.js`

```js
/**
 * Calculates wound capacity and remaining IP from body attribute and wounds.
 * Game rule: A character's wound capacity is Force * 3.
 * @param {number} bodyValue - The Force attribute value.
 * @param {object[]} wounds - Array of wound objects with `ip` numeric fields.
 * @returns {{ ipTotal: number, ipRemaining: number }}
 */
export function calculateWoundCapacity(bodyValue, wounds) {
    const ipTotal = wounds.reduce((sum, w) => sum + (Number(w.ip) || 0), 0);
    const ipRemaining = (bodyValue * 3) - ipTotal;
    return { ipTotal, ipRemaining };
}
```

**Steps:**
1. Create `modules/temporal-kernel/calculate-wound-capacity.js`.
2. Write test:
   - body=5, wounds=[{ip:3},{ip:2}] -> ipTotal=5, ipRemaining=10
   - body=3, wounds=[] -> ipTotal=0, ipRemaining=9
   - body=0, wounds=[{ip:1}] -> ipTotal=1, ipRemaining=-1
3. Update `prepare-data.js:206-209` to call `calculateWoundCapacity`.
4. Run `npm test`.

---

### A7: Gear Bonus Calculation (5x Duplication)

**Current location:** 5 separate files compute `Math.floor((a1+a2+a3)/3)`:
1. `modules/character/prepare-data.js:119`
2. `modules/character/handle-gear-use.js:14-18`
3. `modules/lifeline/controllers/roll-dialog/setup-roll-buttons.js:33,42,50,58`
4. `modules/lifeline/controllers/roll-dialog/execute-situation-roll.js:56-61`
5. `item-sheet.js:59`

**Kernel function:** `modules/temporal-kernel/calculate-gear-bonus.js`

```js
/**
 * Calculates the effective bonus of a gear item from its three aspect values.
 * Game rule: Bonus = floor(average of the three aspects).
 * Fallback: if all aspects are 0 and a legacy bonus exists, use that instead.
 * @param {number} aspect1 - First aspect value.
 * @param {number} aspect2 - Second aspect value.
 * @param {number} aspect3 - Third aspect value.
 * @param {number} [legacyBonus] - Optional pre-existing bonus for backward compat.
 * @returns {number} The computed gear bonus.
 */
export function calculateGearBonus(aspect1, aspect2, aspect3, legacyBonus) {
    const a1 = Number(aspect1) || 0;
    const a2 = Number(aspect2) || 0;
    const a3 = Number(aspect3) || 0;
    if (a1 === 0 && a2 === 0 && a3 === 0 && Number(legacyBonus) > 0) {
        return Number(legacyBonus);
    }
    return Math.floor((a1 + a2 + a3) / 3);
}
```

**Steps:**
1. Create `modules/temporal-kernel/calculate-gear-bonus.js`.
2. Write test `tests/temporal-kernel/calculate-gear-bonus.test.js`:
   - `(3, 3, 3)` -> 3
   - `(1, 2, 3)` -> 2 (floor of 2)
   - `(0, 0, 0, 5)` -> 5 (legacy fallback)
   - `(0, 0, 0, 0)` -> 0
   - `(0, 0, 0)` -> 0 (no legacy)
   - `(1, 0, 0)` -> 0 (floor of 0.333)
3. Update all 5 call sites to import and use `calculateGearBonus`.
4. Run `npm test`.

---

## Section 3: Spanning

### S1: Span Weight Limit Lookup

**Current location:** `modules/character/prepare-data.js:144-146`

**What it does:** `[5, 10, 50, 100, 500, 1000][spanRank] || 5`

**Kernel function:** `modules/temporal-kernel/get-span-weight-limit.js`

```js
/**
 * Returns the maximum weight (kg) a spanner can carry based on span rank.
 * Game rule table: Span 0=5kg, 1=10kg, 2=50kg, 3=100kg, 4=500kg, 5=1000kg.
 * @param {number} spanRank - The character's Span rank (0-5).
 * @returns {number} Maximum carry weight in kg.
 */
export function getSpanWeightLimit(spanRank) {
    const limits = [5, 10, 50, 100, 500, 1000];
    return limits[spanRank] ?? 5;
}
```

**Steps:**
1. Create `modules/temporal-kernel/get-span-weight-limit.js`.
2. Write test:
   - `getSpanWeightLimit(0)` -> 5
   - `getSpanWeightLimit(1)` -> 10
   - `getSpanWeightLimit(5)` -> 1000
   - `getSpanWeightLimit(6)` -> 5 (out of range, default)
   - `getSpanWeightLimit(-1)` -> 5 (out of range, default)
3. Update `prepare-data.js:144-146` and `sheet-data-preparation.js:94-95` to use
   `getSpanWeightLimit`.
4. Run `npm test`.

---

### S2: `isLeveller` Flag

**Current location:** `modules/character/prepare-data.js:146`

**What it does:** `spanRank === 0`

**Kernel function:** `modules/temporal-kernel/is-leveller.js`

```js
/**
 * Determines whether a character is a Leveller (Span rank 0).
 * Game rule: Span 0 characters cannot span and are called Levellers.
 * @param {number} spanRank - The character's Span rank.
 * @returns {boolean} True if the character is a Leveller.
 */
export function isLeveller(spanRank) {
    return spanRank === 0;
}
```

**Steps:**
1. Create `modules/temporal-kernel/is-leveller.js`.
2. Write test: rank 0 -> true, rank 1-5 -> false.
3. Update `prepare-data.js:146` and `sheet-data-preparation.js:96` to use `isLeveller`.
4. Run `npm test`.

---

### S3: `isSpanOverburdened` Check

**Current location:** `modules/character/prepare-data.js:203-204`

**What it does:** `armorSummary.totalEncumbrance > spanWeightLimit`

**Kernel function:** `modules/temporal-kernel/is-span-overburdened.js`

```js
/**
 * Determines whether a spanner is overburdened by carried weight.
 * Game rule: Total encumbrance exceeding span weight limit prevents spanning.
 * @param {number} totalEncumbrance - Combined weight of armor, gear, and weapons.
 * @param {number} spanWeightLimit - Maximum carry weight for the spanner's rank.
 * @returns {boolean} True if the character is overburdened.
 */
export function isSpanOverburdened(totalEncumbrance, spanWeightLimit) {
    return totalEncumbrance > spanWeightLimit;
}
```

**Steps:**
1. Create `modules/temporal-kernel/is-span-overburdened.js`.
2. Write test: 10 > 5 -> true, 5 > 10 -> false, 5 > 5 -> false.
3. Update `prepare-data.js:203-204` and `sheet-data-preparation.js:129` to use
   `isSpanOverburdened`.
4. Run `npm test`.

---

### S4: Span Pool Stats Orchestration

**Current location:** `modules/character/prepare-data.js:21-48` (`_applySpanPoolStats`)

**What it does:** Flattens events from all eras/experiences into a flat array, sorts
by narrative order, calls `calculateSpanPool`, then writes per-event stats back onto
event objects for template rendering.

The kernel math (`calculateSpanPool`) is already in the right place. The problem is
the orchestration (flatten -> sort -> apply) is in the data prep layer instead of
the engine.

**Engine function:** `modules/temporal-engine/compute-span-pool-display.js`

```js
/**
 * Orchestrates span pool computation for template rendering.
 * Reads eras from context, flattens events, calls kernel, applies per-event stats.
 * @param {object} context - Template context with .eras array.
 * @returns {{ spanTimeRemainingFormatted: string, isOverSpan: boolean, eventStats: Map }}
 */
export function computeSpanPoolDisplay(context) { ... }
```

**Steps:**
1. Create `modules/temporal-engine/compute-span-pool-display.js` by extracting
   `_applySpanPoolStats` from prepare-data.js.
2. Write test verifying the flattening and sort behavior.
3. Update `prepare-data.js` to call `computeSpanPoolDisplay` and spread its results
   onto the context.
4. Also update `sheet-data-preparation.js:_applySpanPoolStats` (duplicate) to call
   the same engine function.
5. Run `npm test`.

---

### S5: Ingredient Cap Enforcement in App Spinners

**Current location:** `modules/character/initialize-app-spinners.js:96-105`

**What it does:** During spinner release, clamps ingredient value to
`Math.min(idx, metaRank)` and `Math.min(idx, maxVol - otherTotal)`. Same logic as
`handle-app-ingredient-change.js` (M2, see Section 4).

**This depends on M1 and M2 being extracted first.** After those are in the kernel,
replace the inline clamping in `initialize-app-spinners.js` with calls to the kernel
functions.

**Steps:**
1. After M1 (`getApplicationVolumeLimit`) and M2 (`clampIngredientValue`) are
   created (see Section 4), update `initialize-app-spinners.js:96-105` to import
   and call them.
2. Replace inline `Math.min(idx, metaRank)` with
   `clampIngredientValue(idx, metaRank, otherTotal, maxVol)`.
3. Run `npm test`.

---

## Section 4: Metabilities

### M1: Application Volume Formula

**Current location:** `modules/character/handle-app-ingredient-change.js:15`

**What it does:** `const VOLUME_FORMULA = (analyze) => Math.max(0, (analyze * 3) - 6);`

**Kernel function:** `modules/temporal-kernel/get-application-volume-limit.js`

```js
/**
 * Returns the maximum total ingredient volume for a metability application.
 * Game rule: Volume = max(0, (Analyze * 3) - 6).
 * At Analyze 2: 0, Analyze 3: 3, Analyze 4: 6, Analyze 5: 9.
 * @param {number} analyzeRank - The character's Analyze attribute value.
 * @returns {number} Maximum ingredient volume.
 */
export function getApplicationVolumeLimit(analyzeRank) {
    return Math.max(0, (analyzeRank * 3) - 6);
}
```

**Steps:**
1. Create `modules/temporal-kernel/get-application-volume-limit.js`.
2. Write test:
   - analyze 2 -> 0
   - analyze 3 -> 3
   - analyze 4 -> 6
   - analyze 5 -> 9
   - analyze 0 -> 0 (max clamps negative)
   - analyze 1 -> 0 (max clamps negative)
3. Update `handle-app-ingredient-change.js:15` and `initialize-app-spinners.js:101-102`
   to use `getApplicationVolumeLimit`.
4. Run `npm test`.

---

### M2: Ingredient Value Clamping

**Current location:** `modules/character/handle-app-ingredient-change.js:41-68`

**What it does:** Clamps per-ingredient value to not exceed metability rank and total
volume to not exceed the volume formula. Updates display.

**Kernel function:** `modules/temporal-kernel/clamp-ingredient-value.js`

```js
/**
 * Clamps an ingredient value against two game rule caps:
 * 1. Per-ingredient: cannot exceed the character's rank in that metability.
 * 2. Volume: this ingredient + other ingredients cannot exceed the volume limit.
 * @param {number} value - The raw input value.
 * @param {number} metaRank - The character's rank in this ingredient's metability.
 * @param {number} otherTotal - Sum of all OTHER ingredient values in this application.
 * @param {number} volumeLimit - The application's maximum total volume.
 * @returns {number} The clamped value.
 */
export function clampIngredientValue(value, metaRank, otherTotal, volumeLimit) {
    const clamped = Math.max(0, Math.min(5, Number(value) || 0));
    const rankClamped = Math.min(clamped, metaRank);
    const volumeClamped = Math.min(rankClamped, Math.max(0, volumeLimit - otherTotal));
    return volumeClamped;
}
```

**Steps:**
1. Create `modules/temporal-kernel/clamp-ingredient-value.js`.
2. Write test:
   - value=3, rank=5, otherTotal=2, volLimit=6 -> 3 (no clamp)
   - value=5, rank=3, otherTotal=0, volLimit=6 -> 3 (rank clamp)
   - value=3, rank=5, otherTotal=5, volLimit=6 -> 1 (volume clamp)
   - value=0, rank=5, otherTotal=0, volLimit=6 -> 0
   - value=5, rank=5, otherTotal=6, volLimit=6 -> 0 (volume full)
   - value=-1, ... -> 0 (negative clamped to 0)
3. Update `handle-app-ingredient-change.js:50-58` to use `clampIngredientValue`.
4. Update `initialize-app-spinners.js:96-105` to use `clampIngredientValue`.
5. Run `npm test`.

---

### M3: Dominant Ingredient Detection

**Current location:** `modules/character/handle-app-apply.js:13-20`

**What it does:** Finds which metability ingredient has the highest value in an
application.

**Kernel function:** `modules/temporal-kernel/get-dominant-ingredient.js`

```js
/**
 * Identifies the dominant (highest-valued) metability ingredient in an application.
 * Game rule: The dominant ingredient determines which metability roll to trigger.
 * @param {object} application - Application data with coercion, creativity, farsense, pk, redaction fields.
 * @returns {string|null} The key of the dominant ingredient, or null if all are 0.
 */
export function getDominantIngredient(application) {
    const keys = ['coercion', 'creativity', 'farsense', 'pk', 'redaction'];
    let best = null;
    let bestVal = 0;
    for (const key of keys) {
        const v = Number(application[key]) || 0;
        if (v > bestVal) { bestVal = v; best = key; }
    }
    return best;
}
```

**Steps:**
1. Create `modules/temporal-kernel/get-dominant-ingredient.js`.
2. Write test:
   - `{coercion:3, creativity:1, farsense:0, pk:0, redaction:0}` -> 'coercion'
   - all 0s -> null
   - tie: first wins (coercion before creativity)
3. Update `handle-app-apply.js:13-20,30` to use `getDominantIngredient`.
4. Run `npm test`.

---

### M5: At-Potential State Check

**Current location:** `modules/sheet-spinners.js:336-346`

**What it does:** Compares `current >= potential` and toggles CSS class. The
comparison is a game rule check.

**Kernel function:** `modules/temporal-kernel/is-at-potential.js`

```js
/**
 * Determines whether a metability has reached its operant potential.
 * Game rule: A metability is "at potential" when current value >= potential.
 * @param {number} currentValue - The current metability rank.
 * @param {number} potentialValue - The operant potential ceiling.
 * @returns {boolean} True if at or exceeding potential.
 */
export function isAtPotential(currentValue, potentialValue) {
    return currentValue >= potentialValue;
}
```

**Steps:**
1. Create `modules/temporal-kernel/is-at-potential.js`.
2. Write test: 3>=3=true, 4>3=true, 2<3=false.
3. Update `sheet-spinners.js:336-346` to use `isAtPotential`. CSS class toggling
   stays in the UI.
4. Run `npm test`.

---

### M6: Potential Drag Handler (Cascading Value Cap)

**Current location:** `modules/sheet-spinners.js:396-445`

**What it does:** When potential is lowered via drag, if current value > new
potential, caps current value to new potential. This is the same rule as A3
(`clampValueToPotential`) plus a cascading write.

**Depends on A3.** After `clampValueToPotential` is extracted:
1. Replace inline `if (currentValue > closestIndex)` with
   `clampValueToPotential(currentValue, closestIndex)`.
2. The cascading `actor.update` for the value stays in the UI handler (it's a
   write to the DB), but the *decision* to cap comes from the kernel.
3. Run `npm test`.

---

## Section 5: Combat

### C1: Weapon/Armor Auto-Population on Name Change

**Current location:** `continuum.js:98-149` (`_updateObject`)

**What it does:** When form data includes a changed weapon/armor name, looks up
`ITEM_DATA` and auto-fills all stat fields from the catalog. This is a data
integrity rule: selecting a weapon type should populate its stats.

**Kernel function:** `modules/temporal-kernel/resolve-item-stats.js`

```js
/**
 * Resolves item statistics from the game's item catalog by type and name.
 * When a weapon or armor name changes, its stats should be auto-populated
 * from the authoritative ITEM_DATA catalog.
 * @param {string} itemType - 'rangedWeapons', 'meleeWeapons', or 'armor'.
 * @param {string} itemName - The selected item name.
 * @param {object} itemDataCatalog - The full ITEM_DATA object.
 * @returns {object|null} The stat fields to merge, or null if not found.
 */
export function resolveItemStats(itemType, itemName, itemDataCatalog) {
    if (!itemType || !itemName) return null;
    const collection = itemDataCatalog[itemType];
    if (!collection) return null;
    return collection[itemName] || null;
}
```

**Steps:**
1. Create `modules/temporal-kernel/resolve-item-stats.js`.
2. Write test with mock ITEM_DATA.
3. Update `continuum.js:98-149` to use `resolveItemStats` for the lookup, keeping
   the merge/flatten logic in `_updateObject` since it's Foundry-specific.
4. Run `npm test`.

---

### C2: Vehicle Select Handler (Same Pattern as C1)

**Current location:** `modules/character/activate-listeners.js:124-138`

**What it does:** On vehicle name change, looks up stats in ITEM_DATA and writes
them to the actor.

**Same kernel function as C1.** The vehicle case searches
`ITEM_DATA.vehicles / airVehicles / waterVehicles`. Extend `resolveItemStats` to
handle vehicle lookups, or create a separate `resolveVehicleStats` function.

**Steps:**
1. Add vehicle handling to `resolveItemStats` or create
   `modules/temporal-kernel/resolve-vehicle-stats.js`.
2. Write test.
3. Update `activate-listeners.js:124-138` to use the kernel function.
4. Run `npm test`.

---

### C3: Total Gear Weight Calculation

**Current location:** `modules/character/prepare-data.js:139-142`

**What it does:** `gearItems.reduce((total, item) => { if (!item.system.carried) return total; return total + (weight * quantity); }, 0)`

**Kernel function:** `modules/temporal-kernel/calculate-gear-weight.js`

```js
/**
 * Calculates total weight of all carried gear items.
 * Game rule: only items marked as carried count toward encumbrance.
 * @param {object[]} gearItems - Array of gear item objects.
 * @returns {number} Total carried weight.
 */
export function calculateGearWeight(gearItems) {
    return gearItems.reduce((total, item) => {
        const sys = item.system || item;
        if (!sys.carried) return total;
        return total + (Number(sys.weight) * Number(sys.quantity) || 0);
    }, 0);
}
```

**Steps:**
1. Create `modules/temporal-kernel/calculate-gear-weight.js`.
2. Write test.
3. Update `prepare-data.js:139-142` and `sheet-data-preparation.js:90-93` to use
   `calculateGearWeight`.
4. Run `npm test`.

---

## Section 6: Gear

### G1-G4: Gear Bonus Calculation

**Already covered by A7.** The `calculateGearBonus` kernel function in Section 2
consolidates all 5 duplicates. After A7 is done, these are automatically resolved.

No separate steps needed.

---

## Section 7: Dice Roller Dialog

### D1: Meta Base Target Calculation

**Current location:** `modules/lifeline/controllers/roll-dialog/execute-situation-roll.js:22-34`

**What it does:** `base = highestRank + activeRank` for metability rolls. The
current `calculate-base-target.js` handles the meta case but returns only `5` for
all meta keys. The execute-situation-roll file overrides it with the correct formula.

**Kernel update:** Extend `modules/temporal-kernel/calculate-base-target.js` (the
underlying atomic function) or create a new `calculate-meta-base-target.js`.

**Note:** `calculate-base-target.js` is under `roll-math/` not `temporal-kernel/`.
The roll-math functions are already in the right architectural layer (service
calculators). The fix here is to complete the meta case in `calculate-base-target`
so the roll dialog doesn't need to override it.

**Steps:**
1. Update `modules/lifeline/services/calculators/roll-math/calculate-base-target.js`
   to handle the meta case properly: accept `highestMetaRank` as a parameter and
   return `highestMetaRank + activeRank` instead of just `5`.
2. Update `execute-situation-roll.js:22-34` to use the corrected base target from
   `RollMath.calculateBaseTarget` instead of overriding it.
3. Write test verifying the meta case returns correct values.
4. Run `npm test`.

---

### D2+D4: Speed Penalty Table

**Current location:** Duplicated in two files:
- `modules/lifeline/controllers/roll-dialog/execute-situation-roll.js:5`
- `sheet-dice-roller.js:11`

**Kernel constant:** `modules/temporal-kernel/speed-penalties.js`

```js
/**
 * Speed penalty table for vehicles exceeding their top speed block.
 * Game rule: each speed block above top speed incurs an escalating penalty.
 * Index 0 = 1 block over, index 4 = 5+ blocks over.
 */
export const SPEED_PENALTIES = [0, -3, -6, -9, -15];

/**
 * Calculates the speed modifier for a vehicle at a given speed block.
 * @param {number} selectedSpeed - The current speed block (1-5).
 * @param {number} topSpeed - The vehicle's top speed block.
 * @returns {number} The modifier: positive bonus if within top speed, negative penalty if over.
 */
export function calculateSpeedModifier(selectedSpeed, topSpeed) {
    if (selectedSpeed <= topSpeed) {
        return topSpeed - selectedSpeed;
    }
    const penaltyIndex = selectedSpeed - topSpeed - 1;
    return SPEED_PENALTIES[penaltyIndex] ?? SPEED_PENALTIES[SPEED_PENALTIES.length - 1];
}
```

**Steps:**
1. Create `modules/temporal-kernel/speed-penalties.js`.
2. Write test for `calculateSpeedModifier`:
   - speed=3, top=3 -> 0
   - speed=2, top=3 -> +1
   - speed=4, top=3 -> -3
   - speed=8, top=3 -> -15 (overflow)
3. Update `execute-situation-roll.js:5,36-43` and `sheet-dice-roller.js:11,78-86`
   to use the kernel constant and function.
4. Run `npm test`.

---

### D3: Resonance Bonus Mapping

**Current location:** `modules/lifeline/controllers/roll-dialog/execute-situation-roll.js:45-47`

**What it does:** `'strong' -> 3, 'firm' -> 2, 'slight' -> 1, 'none' -> 0`

**Kernel function:** `modules/temporal-kernel/get-resonance-bonus.js`

```js
/**
 * Returns the dice bonus for a resonance tier.
 * Game rule: Slight=+1, Firm=+2, Strong=+3.
 * @param {string} tier - 'slight', 'firm', 'strong', or 'none'.
 * @returns {number} The dice bonus.
 */
export function getResonanceBonus(tier) {
    const bonuses = { slight: 1, firm: 2, strong: 3 };
    return bonuses[tier] || 0;
}
```

**Steps:**
1. Create `modules/temporal-kernel/get-resonance-bonus.js`.
2. Write test for all four tiers plus unknown string.
3. Update `execute-situation-roll.js:45-47` to use `getResonanceBonus`.
4. Run `npm test`.

---

### D5: Push Modifier Calculation (Meta)

**Current location:** `sheet-dice-roller.js:73-75`

**What it does:** `const mod = actualRank - closestRank;` - calculates push
modifier from actual rank minus selected rank. The pixel-to-rank mapping is UI,
but the modifier formula is a game rule.

**No new kernel function needed.** The formula `actualRank - selectedRank` is too
trivial (single subtraction) to warrant its own kernel file. It's already clearly
documented in context. Keep as-is.

---

## Section 8: Background / Eras / Experiences

### E1: Age Formatting from Seconds

**Current location:** `modules/character/prepare-data.js:182-189`

**What it does:** `Math.floor(subjectiveNowSecs / SECONDS_IN_YEAR)` and
`Math.floor((subjectiveNowSecs % SECONDS_IN_YEAR) / SECONDS_IN_DAY)`

**TTL function:** `modules/temporal-translator/format-age-short.js`

```js
/**
 * Formats a subjective age in seconds to a short years+days object.
 * Used for the Personal Information section's "Age: Xy Yd" read-only display.
 * @param {number} totalSeconds - Subjective age in seconds since birth.
 * @returns {{ years: number, days: number }}
 */
export function formatAgeShort(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    return {
        years: Math.floor(s / SECONDS_IN_YEAR),
        days: Math.floor((s % SECONDS_IN_YEAR) / SECONDS_IN_DAY)
    };
}
```

Note: `formatSubjectiveAge` in `age-converter.js` already does the full
"Xy Yd HH:MM:SS" format. This is a simplified version for the personal section
that only needs years+days.

**Steps:**
1. Create `modules/temporal-translator/format-age-short.js`.
2. Write test:
   - 0 seconds -> {years:0, days:0}
   - SECONDS_IN_YEAR -> {years:1, days:0}
   - SECONDS_IN_YEAR + SECONDS_IN_DAY -> {years:1, days:1}
   - SECONDS_IN_YEAR * 2 + SECONDS_IN_DAY * 5 -> {years:2, days:5}
3. Update `prepare-data.js:182-189` and `sheet-data-preparation.js:112-116` to use
   `formatAgeShort`.
4. Run `npm test`.

---

### E2: Era/Experience/Event Flattening and Sorting

**Current location:** `modules/character/prepare-data.js:148-177`

**What it does:** Converts nested `system.eras` objects into sorted arrays for
Handlebars iteration. Applies sort direction from a flag. This is data
restructuring that should live in the engine.

**Engine function:** `modules/temporal-engine/flatten-history-for-template.js`

```js
/**
 * Converts the nested eras object structure into sorted flat arrays
 * suitable for Handlebars template iteration.
 * @param {object} rawEras - The system.eras object from actor data.
 * @param {string} sortDirection - 'asc' or 'desc'.
 * @returns {object[]} Array of era objects with nested experiences/events arrays.
 */
export function flattenHistoryForTemplate(rawEras, sortDirection) { ... }
```

**Steps:**
1. Create `modules/temporal-engine/flatten-history-for-template.js` by extracting
   lines 148-177 from prepare-data.js.
2. Write test verifying the flattening, sort direction, and structure.
3. Update `prepare-data.js` to call `flattenHistoryForTemplate`.
4. Update `sheet-data-preparation.js` to call the same function (it duplicates
   this logic).
5. Run `npm test`.

---

## Section 9: Wounds

### W1: Wound Capacity Formula

**Already covered by A6.** The `calculateWoundCapacity` kernel function in Section 2
handles `body * 3 - totalIP`.

No separate steps needed.

---

## Execution Order (Dependencies)

Some extractions depend on others being completed first. Recommended order:

**Phase 1 (No dependencies):**
- P3 (sync-actor-name) - trivial
- P4 (GEAR_ASPECT_LABELS) - constant move
- P5 (css-class-from-fraternity) - utility
- S1 (get-span-weight-limit) - table lookup
- S2 (is-leveller) - trivial
- S3 (is-span-overburdened) - comparison
- M1 (get-application-volume-limit) - formula
- M5 (is-at-potential) - comparison
- A6/W1 (calculate-wound-capacity) - formula
- D3 (get-resonance-bonus) - mapping
- E1 (format-age-short) - TTL format

**Phase 2 (Depends on Phase 1):**
- P1 (is-unit-gated) - needs org sheet context
- P2 (date-field-registry) - needs careful regex verification
- A1+A2 (clamp-temp-to-perm) - spinner integration
- A3 (clamp-value-to-potential) - depends on A1/A2 pattern
- A5 (armor IP totals + total encumbrance) - depends on C3
- A7/G1-G4 (calculate-gear-bonus) - 5 call sites to update
- M2 (clamp-ingredient-value) - depends on M1
- M3 (get-dominant-ingredient) - standalone but touches spinner

**Phase 3 (Depends on Phase 2):**
- S4 (compute-span-pool-display) - engine orchestration
- S5 (ingredient caps in spinner) - depends on M1+M2
- M6 (potential drag handler) - depends on A3
- C1+C2 (resolve-item-stats, resolve-vehicle-stats) - _updateObject integration
- C3 (calculate-gear-weight) - used by A5
- D1 (meta base target fix) - roll-math layer update
- D2+D4 (speed penalties) - two call sites
- E2 (flatten-history-for-template) - engine extraction

**Phase 4 (Final cleanup):**
- Remove `_calculateArmorSummary` from `sheet-data-preparation.js` (was duplicate)
- Remove `_applySpanPoolStats` from `sheet-data-preparation.js` (was duplicate)
- Verify all templates render identically
- Full test suite pass