# TTL Hard Cutover Migration - 2026-05-05

## Summary

Migrated ~60 consumer files from indirect barrel imports (`span-graph-utils/provide-span-graph-utils.js` and `span-graph-utils.js`) to direct TTL (Temporal Translator) imports. Deleted 12 legacy wrapper files. Rewrote CSV import to use batch write with physics walk instead of per-event insertion. Fixed Projector Trinity violations by removing TTL calls from dumb renderers.

## Four Commits

### 1. `f625bc5` - Rewrite CSV import: batch write with physics walk instead of per-event insertion

**Problem**: `importFromCsv` called `submitNewRow` once per event, which invoked `insertHistoryRow` and its compensation wave for each row. The compensation wave shifts downstream nodes' ages, which is correct for interactive single-event insertion but causes cascading corruption during batch imports: each newly-inserted event triggers a wave that re-shifts all previously-inserted events.

**Solution**: Bypass `insertHistoryRow` entirely for batch imports. Instead:
- Pre-compute all event ages using `projectSubjectiveAge(ts, currentOffset)` - the same physics as `establishHistoryPhysics`
- Update `currentOffset` after each span via `computeOffsetFromArrival(arrivalTs, eventAge)`
- Write all events in a single `actor.update()` call
- No compensation wave, no incremental shifts, no race conditions

**Key insight**: The compensation wave solves interactive insertion (user clicks a pixel, wave corrects downstream ages). But during batch import, every node is being inserted by the same authority, so pre-computation is both correct and more efficient.

### 2. `6f84e31` - Hard cutover TTL migration: redirect all consumers to direct imports, delete 12 legacy wrappers

**Problem**: The `span-graph-utils` barrel files re-exported TTL functions through wrapper files, creating an unnecessary indirection layer. Each wrapper just called through to the TTL implementation. This violated the "no code in UI/database" principle and made the dependency graph opaque.

**Solution**: Direct import migration in 5 phases:

| Phase | Functions Migrated | Consumer Files | Wrappers Deleted |
|-------|-------------------|---------------|------------------|
| 1 | `formatSubjectiveAge`, `parseAgeString`->`parseSubjectiveAge`, `formatDuration` | 11 | 3 |
| 2 | `convertTimestampToDateString`->`timestampToDateString`, `normalizeDateInput` | ~39 | 3 |
| 3 | `convertSecondsToDateString` | 4 | 1 |
| 4 | `SECONDS_IN_YEAR`, `SECONDS_IN_DAY`, `MS_IN_YEAR`, `MS_IN_DAY` | 11 | 0 |
| 5 | `formatObjectiveDate`->`formatObjectiveDateLines` | 3 | 1 |

Also added `MS_IN_YEAR` and `MS_IN_DAY` to `temporal-engine/constants.js` (previously derived only in `span-graph-utils/constants.js`).

**Deleted wrappers** (-90 lines net):
- `format-subjective-age.js`, `parse-age-string.js`, `format-duration.js`
- `convert-timestamp-to-date-string.js`, `normalize-date-input.js`
- `format-objective-date.js`, `convert-seconds-to-date-string.js`
- `format-date.js`, `format-time.js`, `diff-seconds.js`
- `format-subjective-age-smart.js`, `format-objective-date-smart.js`

**Barrel files updated**: Now only export genuine `span-graph-utils/` functions:
- `parseDate` (STIME parser)
- `isCoordsValid` (spatial validation)
- `getAgeStringFromDate` (convenience combining TTL+kernel)
- `findAgeForDate`, `findExperienceForDate`, `mapDateToSubjective` (lifeline queries)
- `getObjectiveDateFromSubjectiveX` (viewport math)
- Constants (`SECONDS_IN_YEAR`, `SECONDS_IN_DAY`, `MS_IN_YEAR`, `MS_IN_DAY`)

**Remaining in `span-graph-utils/`** (not deleted, still genuinely used):
- `constants.js` - re-exports from `temporal-engine/constants.js` plus derives `MS_IN_YEAR`/`MS_IN_DAY`
- `parse-date.js` - STIME format parser (domain-specific, not in TTL)
- `is-coords-valid.js` - SVG coordinate validation (spatial, not temporal)
- `get-age-string-from-date.js` - convenience combining `projectSubjectiveAge` + `formatSubjectiveAge`
- `get-objective-date-from-subjective-x.js` - viewport math (spatial)
- `find-age-for-date.js`, `find-experience-for-date.js`, `map-date-to-subjective.js` - lifeline queries

### 3. `a90dc84` - Remove unused calculateSpanDisplacement import

Fixed `import-spreadsheet-csv.js` referencing a non-existent export name (`calculateSpanDisplacement` vs actual `calculateDisplacementPool`). The import was unused and removed entirely.

### 4. `d4d36c0` - Projector Trinity fix: remove TTL calls from renderers, move formatting to projection layer

**Problem**: The Trinity mandate says Projectors (renderers) are dumb pipes that receive a Render Manifest. They must NOT call TTL, Kernel, or State functions. But `axis-renderer.js` called `formatSubjectiveAge()` and `timestampToDateString()` directly, and `update-axis-labels.js` (legacy lifeline) called `formatObjectiveDateLines()` and `formatSubjectiveAge()`.

**Solution**: Move all human-readable string formatting out of dumb renderers and into the projection/orchestrator layer:

| File | Before | After |
|------|--------|-------|
| `axis-renderer.js` | Called TTL directly | Receives pre-formatted `axisData` param from `computeAxisLabels()` |
| `compute-axis-labels.js` | (new file) | Projection-layer function that formats via TTL and returns `{ ageLabels, timeLabels }` |
| `handle-rendering.js` | Called `axisRenderer.render()` | Calls `viewport.computeAxisLabels()` then `axisRenderer.render(axisData)` |
| `viewport.js` | No axis label method | Added `computeAxisLabels()` method delegating to projection function |
| `update-axis-labels.js` | Called TTL directly | Accepts pre-formatted `axisLabels` param, falls back to raw coords if omitted |
| `grid-painter.js` | No TTL imports | Added `computeLegacyAxisLabels()` that formats labels via TTL before passing to painter |
| `draw-debug-node-labels.js` | Called TTL directly | Documented as acceptable (commented-out debug overlay) |

**Exempted from Trinity rule** (physical constants, not TTL/Kernel/State):
- `grid-renderer.js`: imports `calculateGridStep` (viewport math) and `MS_PER_SECOND` (unit constant)
- `draw-grid-lines.js`: imports `SECONDS_IN_YEAR`, `MS_IN_YEAR` (unit constants for grid spacing)
- `draw-experience-blocks.js`: imports `SECONDS_IN_YEAR` (unit constant for 15-year opacity fade)

## Test Baseline

22 test files fail (38 tests), all pre-existing DOM/environment failures. 291 tests pass. No regressions introduced.

## Architecture Impact

Before: Consumer -> barrel (provide-span-graph-utils.js) -> wrapper (format-subjective-age.js) -> TTL (age-converter.js)
After: Consumer -> TTL (age-converter.js) directly

Before: Renderer -> TTL (formatSubjectiveAge, timestampToDateString) directly
After: Projection layer -> TTL -> pre-formatted data -> Renderer (dumb pipe)

This makes the Trinity dependency graph explicit: Projector and Dialog layers now import directly from TTL or receive pre-formatted data from the projection layer, making it clear when UI code is calling translation functions vs. when it's calling Kernel or State functions. Renderers never call TTL.