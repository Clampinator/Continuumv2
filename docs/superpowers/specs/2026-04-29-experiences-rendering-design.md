# Experiences Management & Rendering - Design Spec

Date: 2026-04-29

## Goal

Make experience bounding boxes render correctly on the character lifeline, with proper start/end alignment to event nodes, correct opacity fading, functional click-to-edit, and a new two-axis bonus system (Duration + Distance from NOW).

## Background

Experiences are containers in the Continuum RPG lifeline. Each experience has a start event and optionally an end date. Events that open/close experiences are stored inside the experience's `events` object in the actor data. The lifeline renders as a 2D SVG where X = subjective age (seconds) and Y = objective time (epoch ms).

The existing Tempoal Translation Layer (TTL) correctly handles the **write path** -- inserting/editing events via `Translator.toAtomic()` produces correct numeric timestamps. The **read path** (rendering) is broken in 7 places documented below.

## Bonus System: Duration + Distance

Experience bonuses are determined by TWO independent axes, combined additively or via a lookup table:

### Duration Bonus (experience length)

| Duration | Bonus |
|----------|------|
| 0 - 6 months | 0 |
| 6 - 24 months | +1 |
| 24 - 48 months | +2 |
| 48+ months | +3 |

### Distance Bonus (time since experience ended, relative to NOW)

| Distance from NOW | Bonus |
|-------------------|-------|
| < 2 years | +3 |
| 2 - 5 years | +2 |
| 5 - 10 years | +1 |
| > 10 years | 0 |

### Combined Bonus

The total dice bonus = min(Duration Bonus + Distance Bonus, 3). The cap prevents bonuses higher than +3.

For **ongoing** experiences: Distance bonus = +3 (always recent), and Duration bonus counts the elapsed time so far.

## Seven Pipeline Fixes

### Fix 1: ChronologyAssembler must produce numeric eventTime

**File:** `modules/lifeline/services/chronology-assembler.js`

Add `_ensureTime()` that converts date/time strings to numeric epoch-ms timestamps:
- For non-span events: parse `event.date || event.eventDate` + `event.time || event.eventTime` into `event.eventTime` (epoch ms)
- For span events: parse `event.spanFromDate || event.eventSpanFromDate` + `event.spanFromTime || event.eventSpanFromTime` for departure; also compute `arrivalY` from `spanToDate`/`spanToTime`
- Fix `_ensureAge()` to check `event.age` before `event.eventAge` (physics shifts update `.age`)
- Fix field fallbacks: `date || eventDate`, `time || eventTime`, `isSpan || eventIsSpan`, `spanFromDate || eventSpanFromDate`, etc.

### Fix 2: processGraphData must populate experienceSegments

**File:** `modules/span-graph-data-processor.js`

`processGraphData()` currently only sets `graphData.levelNodes`. It must also:
- Map orderedEvents to `coordinateNodes` with `{id, eraId, expId, x, y}` format
- Call `generateExperiences(sortedEras, coordinateNodes, nowNode, actor)`
- Set `graphData.experienceSegments` with the result

### Fix 3: generateExperiences output field names must match drawExperienceBlocks

**File:** `modules/lifeline/services/segment-generator/generate-experiences.js`

Change output from `{startX, endX, startY, endY, id, name, eraId, isOngoing, opacity}` to `{startAge, endAge, startTime, endTime, id, name, eraId, isOngoing, isClosed, opacity, bonus}`.

The `id` field must match what `drawExperienceBlocks` reads as `seg.id` (currently it reads `seg.expId` which doesn't exist -- fix to `seg.id`).

### Fix 4: generateExperiences must handle closed vs ongoing correctly

**File:** `modules/lifeline/services/segment-generator/generate-experiences.js`

Current logic: uses the last event in the experience's chain as the "closer". This is wrong because most experiences only contain their opener event.

New logic:
- **Ongoing experience**: end coordinates = NOW node
- **Closed experience with 2+ chain events**: end coordinates = last chain event (expansion)
- **Closed experience with 0-1 chain events**: end coordinates from `exp.dateTo` via `parseObjectiveTime()` + `mapDateToSubjective()`
- Implement the two-axis bonus system (Duration + Distance)

### Fix 5: All painters must use numeric eventTime

**Files:** Multiple painters

Every painter that reads `levelNodes` or `nowNode` must use the fallback pattern:
```js
const age = node.age !== undefined ? node.age : node.eventAge;
const time = node.eventTime !== undefined ? node.eventTime : node.time;
```

Files to fix:
- `draw-events-and-paths.js` (uses `p1.age`, `p1.time`)
- `update-now-node.js` (uses `graphData.nowNode.age`, `graphData.nowNode.time`)
- `update-yet-nodes.js` (uses `now.age`, `now.time`, `yet.age`, `yet.time`)
- `goal-connection-painter.js` (uses `node.age`, `node.time`)
- `draw-debug-node-labels.js` (uses `node.age`, `node.time`)
- `subway-painter.js` (uses `p1.age`, `p1.time`)
- `path-painter.js` (already has fallbacks, but priority should be `.age` then `.eventAge`)

### Fix 6: Bonus calculation reads `age` not `eventAge`

**File:** `modules/lifeline/services/calculators/resonance-calculator/calculate-resonance-bonuses.js`

Line 33 reads `data.eventAge` but `aggregate-active-experiences.js` stores `data.age`. Fix to read `data.age !== undefined ? data.age : data.eventAge`.

Also update `map-years-to-bonus.js` to implement the new two-axis bonus system.

### Fix 7: flattenEvents crash bug

**File:** `modules/span-graph-data-processor.js`

Line 19 references `eventDate` without `event.` prefix -- causes `ReferenceError` for non-span events. Fix:
- `eventDate` -> `event.eventDate || event.date`
- Add short-name fallbacks for all fields (`event.date || event.eventDate`, `event.time || event.eventTime`, etc.)

## User-Facing Fixes

### UF1: Default experience name in event dialog

**File:** `modules/lifeline/services/ui/event-dialog/get-template-data.js`

Add `defaultNewExpName: eventIsSpan ? "Parallel Project" : "New Experience"` to template data. The HTML template already has `{{defaultNewExpName}}` -- just the data provider was missing it.

### UF2: Merge experience edit into event dialog (remove separate dialog)

The separate `span-graph-dialog-experience.js` is removed. Right-clicking an experience rect/label now opens the **event dialog** in edit mode for the opener event, with the experience section expanded.

Changes:
- **`process-experience-click.js`**: Route to `openEventDialog()` instead of `openExperienceEditDialog()`. Pass the opener event's data as `existingData`.
- **`draw-experience-blocks.js`**: Add `data-id` and `data-era-id` attributes to rect elements (currently only labels have them). Fix `seg.expId` references to `seg.id`. Store the opener event ID as `data-opener-id` so the click handler knows which event to edit.
- **`span-graph-dialogs-edit.js`**: Remove the `case 'experience'` branch from `openEditDialog()`.
- **`span-graph-dialog-experience.js`**: Delete this file (or mark deprecated). Its fields (name, description, dateFrom, dateTo, isOngoing) are already available from within the event dialog's experience lifecycle controls.
- **`event-node-editor.html`**: Add an "Experience Name" and "Description" field to the `#newExpGroup` section that appears when `startNewExp` is checked. Also add these fields in a read/edit section for the current experience when editing an opener event.

### UF3: Opacity fading rule

**File:** `modules/lifeline/services/segment-generator/generate-experiences.js`

For closed experiences, opacity fades from 100% down to 10% over 15 years:
```js
opacity = Math.max(0.1, 1.0 - (yearsSince / 15) * 0.9)
```
For ongoing experiences, opacity = 1.0. The `drawExperienceBlocks` renderer uses `seg.opacity` directly (no recalculation).

Single authority: `generateExperiences` computes opacity, `drawExperienceBlocks` applies it.

## Files Changed Summary

| File | Change |
|------|--------|
| `chronology-assembler.js` | Add `_ensureTime()`, fix `_ensureAge()` field priorities and fallbacks |
| `span-graph-data-processor.js` | Fix `flattenEvents()` crash bug, populate `experienceSegments` in `processGraphData()` |
| `generate-experiences.js` | Fix output field names, closed experience bounds, two-axis bonus, opacity |
| `draw-experience-blocks.js` | Add `data-id`/`data-era-id`/`data-opener-id` to rects, fix field name refs |
| `process-experience-click.js` | Route to `openEventDialog()` instead of `openExperienceEditDialog()` |
| `span-graph-dialogs-edit.js` | Remove `case 'experience'` branch |
| `span-graph-dialog-experience.js` | Remove or deprecate |
| `update-nodes.js` | Field fallback pattern for age/time |
| `update-now-node.js` | Field fallback pattern |
| `update-yet-nodes.js` | Field fallback pattern |
| `draw-events-and-paths.js` | Field fallback pattern |
| `goal-connection-painter.js` | Field fallback pattern |
| `draw-debug-node-labels.js` | Field fallback pattern |
| `subway-painter.js` | Field fallback pattern |
| `path-painter.js` | Update priority to `.age` before `.eventAge`, fix `isSpan` check |
| `get-template-data.js` (event dialog) | Add `defaultNewExpName`; add experience name/description fields for opener events |
| `get-actor-history.js` | Fix field fallbacks for legacy events |
| `calculate-resonance-bonuses.js` | Fix `data.age` vs `data.eventAge` |
| `map-years-to-bonus.js` | Implement two-axis bonus system |
| `temporal-translator.js` | Update `calculateExperienceBonus()` for two-axis system |

## Out of Scope

- Rewrite of the TTL layer
- New LifelineEngine module
- Fixing the `resolve-narrative-order.js` bug (e.x/e.y on history nodes)
- Fixing the `update-history-row.js` fallback bug (eraId/expId)
- DST ambiguity in `parseObjectiveTime()`
- Location resolver timezone map expansion