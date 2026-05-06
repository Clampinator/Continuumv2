# Remaining Refactor Plan

Execution order for the last ~10 items. Each item has: problem, fix, files affected,
test requirements, and dependency notes.

---

## Item 0: Rest Timezone Round-Trip Bug (HOT)

**Status:** In progress (partially fixed, timezone drift remains)

### Problem
`createEndOfRestEvent` (handle-rest-toggle.js) computes `endTs` correctly as an
absolute millisecond timestamp, but then formats it using `new Date(endTs).getFullYear()/
.getHours()` which read LOCAL browser timezone. `insertHistoryRow` re-parses those
strings via `Translator.toAtomic()` -> `parseObjectiveTime()` which uses the character's
timezone (often UTC). The mismatch introduces a drift equal to the browser's UTC offset.

Result: End of Rest event lands ~12h off, green rest rail extends past NOW, NOW sits
at rest-start instead of rest-end.

### Fix (Two Parts)

**Part A: `insert-history-row.js`** - After `Translator.toAtomic()`, override `atomic.ts`
and `atomic.arrivalTs` with any pre-computed values from `data`:

```js
// After line 30: const atomic = Translator.toAtomic(data, history, actor);
// AUTHORITY: Pre-computed timestamps bypass the string round-trip.
// Callers like createEndOfRestEvent that have exact ms values must
// not suffer drift through date string formatting/re-parsing.
if (Number(data.ts)) atomic.ts = Number(data.ts);
if (Number(data.arrivalTs)) atomic.arrivalTs = Number(data.arrivalTs);
```

**Part B: `handle-rest-toggle.js`** - Use `formatObjectiveTime(endTs, context)` with
the character's timezone context instead of `new Date()` local getters. Also pass
`ts: endTs` and `arrivalTs: endTs` in the record so Part A activates:

- Replace lines 49-53 (the `new Date()` formatting block) with a call to
  `formatObjectiveTime(endTs, context)` from the TTL.
- Compute context via `resolveLocationContext(history, sourceAge, actor)` with
  actual history (not empty array).
- Add `ts: endTs` and `arrivalTs: endTs` to the `record` object.

### Files
- `modules/state/insert-history-row.js` (3 lines added after line 30)
- `modules/lifeline/services/ui/handle-rest-toggle.js` (rewrite lines 29-53)

### Tests
- Unit test: `createEndOfRestEvent` with known UTC+5 timezone actor produces
  End of Rest at exactly +86400s age and +86400000ms ts.
- Regression test: string round-trip drift must be 0ms for pre-computed timestamps.

### Dependencies
None. This is the first item to execute.

---

## Item 1: `updateHistoryRow` Pre-Computed Timestamps (Parallel with Item 0)

### Problem
Same round-trip vulnerability as Item 0 but in the update path. Currently
`updateHistoryRow` also always runs `Translator.toAtomic()` and overwrites
any pre-computed `ts`/`arrivalTs`. If a caller provides exact timestamps
(e.g., from editing a span arrival node), the string round-trip can shift them.

### Fix
Same pattern as Item 0 Part A. After line 51 (`let atomic = Translator.toAtomic(...)`):

```js
if (Number(data.ts)) atomic.ts = Number(data.ts);
if (Number(data.arrivalTs)) atomic.arrivalTs = Number(data.arrivalTs);
```

### Files
- `modules/state/update-history-row.js` (2 lines added after line 51)

### Tests
- Existing update tests should still pass (no behavior change for callers
  that don't provide `ts`).
- Add test: update with pre-computed `ts` preserves the exact value.

---

## Item 2: Purge Displacement Threshold from pointer-machine.js

**Status:** Done

### Problem
`pointer-machine.js:406` has a hard-coded `60000` (1-minute) displacement
threshold that cancels span insertion for near-zero drags. This is a Kernel
decision (business rule) sitting in the UI/interaction layer. Trinity violation.

### Fix (Applied)
- Added `MIN_DRAG_DISPLACEMENT_MS = 60000` to `temporal-engine/constants.js`
  with comment: "UX GUARD, not a physics rule."
- Added zero-displacement validation (rule 3) to `validateSpanPhysics()` in
  `modules/temporal-kernel/validate-span-physics.js`. A span where
  departure === arrival is physically meaningless.
- `pointer-machine.js` now imports `MIN_DRAG_DISPLACEMENT_MS` and uses it
  with a comment: "UX GUARD (not physics): Near-zero displacement means the
  user clicked without meaningful drag."

### Decision
The 60000ms threshold is a UX guard, NOT a physics rule. Sub-minute spans are
physically valid for Span Rank 1+. The Kernel rejects ZERO-displacement spans
(departure === arrival), which is a physics constraint. The interaction layer
keeps the 1-minute UX guard to prevent accidental dialog opens.

### Files
- `modules/temporal-engine/constants.js` (add constant)
- `modules/temporal-kernel/validate-span-physics.js` (add rule IF physics)
- `modules/span-graph/interaction/pointer-machine.js` (remove or annotate line 406)

### Tests
- `validateSpanPhysics` test: displacement < MIN_SPAN_DISPLACEMENT_MS returns
  `isValid: false` with clear error message (if physics rule).
- Or: pointer-machine test: near-zero displacement cancels insertion (if UX guard).

---

## Item 3: Purge Animation Math from yet-renderer.js

**Status:** Done

### Problem
`yet-renderer.js:79-82` computes shake amplitude and duration from `frag` count
inside the renderer. Also line 111: particle duration scaled from `yet.frag`.
This is logic (not pure coordinate conversion) in the Projector layer. Trinity
violation: the renderer decides HOW MUCH to shake based on raw data, rather than
receiving pre-computed shake parameters from the manifest.

### Fix (Applied)
- Added `computeYetShakeParams(frag)` to `yet-physics.js` returning
  `{ shakeAmplitude, shakeDuration, particleDurationOffset }`.
- `resolveYetNodes` includes shake params on violated Yet node objects.
- `manifest-generator.js` passes shake params through to `yetNodes`.
- `yet-renderer.js` reads `yet.shakeAmplitude`/`yet.shakeDuration` instead of
  computing them. Particles use `yet.particleDurationOffset` instead of
  computing from `yet.frag`.
- Added floating-point rounding in `computeYetShakeParams` to avoid display
  artifacts (e.g. 0.22999... instead of 0.23).

### Files
- `modules/temporal-kernel/yet-physics.js` (add computeYetShakeParams)
- `modules/span-graph/projection/manifest-generator.js` (pass shake params)
- `modules/span-graph/renderers/yet-renderer.js` (read pre-computed params)

### Tests
- `computeYetShakeParams(0)` returns `{ shakeAmplitude: 4, shakeDuration: '0.35s' }`.
- `computeYetShakeParams(6)` returns `{ shakeAmplitude: 13, shakeDuration: '0.23s' }`.
- Large frag caps at `shakeAmplitude: 12`.

---

## Item 4: Purge `if(eventIsSpan)` Decision Logic from insert-history-row.js

**Status:** Done

### Problem
`insert-history-row.js` had span-specific debug logging blocks and a
NOW-position ternary (`eventIsSpan ? arrivalTs : ts`) that made the State
layer decide which timestamp to use based on domain semantics.

### Fix (Applied)
- Removed two `if (data.eventIsSpan)` debug blocks (lines 42-54 and 85-96).
  These were console.warn calls that only fired for spans, producing noise
  in production.
- Created `computeNowPosition(atomic)` in `modules/temporal-kernel/compute-now-position.js`.
  Returns `{ objectiveNow, subjectiveNow }` where `objectiveNow = arrivalTs`
  for spans, `ts` for levels. This is a Kernel rule (physics decides which
  timestamp represents NOW), not a State decision.
- `insert-history-row.js` now calls `computeNowPosition(atomic)` instead of
  the inline ternary.

### Files
- `modules/state/insert-history-row.js` (removed span debug blocks, added Kernel import)
- `modules/temporal-kernel/compute-now-position.js` (NEW)
- `tests/temporal-kernel/compute-now-position.test.js` (NEW - 4 tests)

---

## Item 5: Purge `if(eventIsSpan)` Decision Logic from update-history-row.js

**Status:** Done

### Problem
`update-history-row.js` had:
1. `_editArrivalOnly` span data reconstruction (27-43) rebuilding full span
   data from oldNode.record when the user edits just the arrival node.
2. Departure delta preservation (56-61) moving arrival by the same delta
   to conserve span duration.

Both are domain decisions sitting in the State layer.

### Fix (Applied)
- Created `adjustSpanOnDepartureEdit(newTs, oldTs, oldArrivalTs)` in
  `modules/temporal-kernel/adjust-span-departure.js`. This is the span
  duration conservation physics rule, extracted from State.
- `update-history-row.js` now uses `adjustSpanOnDepartureEdit()` instead of
  inline delta math.
- Moved `_editArrivalOnly` reconstruction to `handle-submit.js` (dialog
  layer). The dialog is responsible for assembling complete form data before
  calling the State layer. The State layer no longer reconstructs span
  data from oldNode.record.
- `_editArrivalOnly` flag still passes through to State so it knows NOT to
  apply departure-delta preservation for arrival-only edits.

### Files
- `modules/state/update-history-row.js` (removed span reconstruction, added Kernel import)
- `modules/temporal-kernel/adjust-span-departure.js` (NEW)
- `modules/lifeline/services/ui/event-dialog/handle-submit.js` (moved arrival reconstruction here)
- `tests/temporal-kernel/adjust-span-departure.test.js` (NEW - 5 tests)

---

## Item 6: Purge Semantic Derivation from get-actor-history.js

**Status:** Done

### Problem
`get-actor-history.js` lines 75-76 derived `isRestEnd: Boolean(event.isRestEnd)`
and `eventIsRest: Boolean(event.eventIsRest)` from raw event data. This is
semantic classification that belongs in the Kernel, not the State layer.
State should report raw values; Kernel classifies them.

### Fix (Applied)
- Removed `Boolean()` coercion from `eventIsRest` and `isRestEnd` in `mapToFact`.
  These now pass through `event.eventIsRest` and `event.isRestEnd` as-is
  (may be `undefined` instead of `false`).
- All downstream consumers already use `!!`, `Boolean()`, or truthiness
  checks at point-of-use, so no behavioral change.
- Kernel (`establish-history-physics.js`) already applies
  `isRest = !!record.eventIsRest && !eventIsSpan`.

### Files
- `modules/state/get-actor-history.js` (removed Boolean coercion)

---

## Item 7: Spanning Core Physics Phase 3 - Post-Save Handshake

**Status:** Done

### Problem
After a span event is saved, there was no verification that the DB integers
match the visual coordinates the user saw during the drag. A drift in the
TTL round-trip could silently place the event at a different position.

### Fix (Applied)
- Created `verifySpanCoordinates(committed, target, toleranceMs)` in
  `modules/temporal-kernel/verify-span-coordinates.js`. Pure Kernel function
  that compares committed ts/arrivalTs/eventAge against intended values.
  Logs a warning if drift exceeds 1000ms (configurable). This is a defense
  mechanism, not a correction loop.
- `insertHistoryRow` now returns `{ id, committedTs, committedArrivalTs,
  committedAge }` instead of just `newId`. Callers that captured the ID
  now use `.id`.
- `updateHistoryRow` now returns `{ id, committedTs, committedArrivalTs,
  committedAge }` instead of void.
- `handle-submit.js` calls `verifySpanCoordinates` after both insert and
  update for span events. Insert targets come from drag parameters
  (params.departure/arrival). Edit targets come from the old record for
  arrival-only spans (departure should not shift).
- `submit-spreadsheet-row.js` updated to use `result.id` instead of `newId`.

### Files
- `modules/temporal-kernel/verify-span-coordinates.js` (NEW)
- `modules/state/insert-history-row.js` (returns object instead of string)
- `modules/state/update-history-row.js` (returns object instead of void)
- `modules/lifeline/services/ui/event-dialog/handle-submit.js` (verification calls)
- `modules/lifeline/spreadsheet/submit-spreadsheet-row.js` (updated return handling)
- `tests/temporal-kernel/verify-span-coordinates.test.js` (NEW - 7 tests)

---

## Item 8: Historical Span Insertion Phase 3 - UI

**Status:** Done

### Problem
The Insert Span dialog needs to show before/after objective times for the
insertion point, so the user can see the downstream impact before committing.
Currently the dialog just shows departure/arrival fields without context.

### Fix (Applied)
- Added "Downstream Impact" section to `span-result-dialog.html` template.
  Shows a scrollable list of affected events with their old date, new date,
  and shift magnitude (e.g. "+2.0y", "+3.5d", "+1.0h").
- Added `_computeDownstreamImpact()` to `open-span-dialog.js` which:
  1. Computes splice point via `computeSplicePoint`
  2. Computes displacement via `calculateInsertionDisplacement`
  3. Builds virtual preview history via `buildPreviewHistory`
  4. Runs compensation wave via `solveHistoryPhysics`
  5. Formats shifts using TTL `timestampToDateString`
- Section only appears when there ARE downstream shifts (>1 second drift).
- All data uses TTL for formatting - no raw timestamp display.

### Files
- `templates/dialogs/span-result-dialog.html` (downstream impact section)
- `modules/lifeline/services/ui/span-dialog/open-span-dialog.js`
  (_computeDownstreamImpact + new imports: buildPreviewHistory, solveHistoryPhysics,
  calculateInsertionDisplacement, computeSplicePoint, getActorHistory,
  timestampToDateString, parseObjectiveTime, resolveLocationContext)

### Tests
- Dialog template test: impact section renders with at least one affected event.
- No new Kernel tests (this is all UI).

---

## Item 9: Remaining Feature Tracks (Future Work)

These are larger feature tracks not yet started. Listed for completeness; each
needs its own detailed plan before execution.

### 9a: Space-Time Map Integration
Bidirectional link between lifeline events and Foundry map.
- Outbound: click event -> pan map to lat/lng
- Inbound: drop pin -> populate event location fields
- 3 phases in TRACKS.md

### 9b: Main Character Sheet Integration
Embed lifeline/spreadsheet as tabs in the character sheet.
- Tabbed interface, persistent viewport, real-time re-render
- 3 phases in TRACKS.md

### 9c: UI/UX Fidelity Audit
Label de-confliction, tooltip enhancement, spreadsheet usability.
- Label placement algorithm, hierarchical tooltips, filtering
- 3 phases in TRACKS.md

### 9d: Era Navigation & Drag Bar
Macro-navigation bar with era blocks and scrubber.
- EraBarRenderer, click-to-pan, bidirectional sync
- 3 phases in TRACKS.md

---

## Execution Order

Items must be executed in this order due to dependencies:

```
Item 0 + Item 1  (parallel - timezone/timestamp fix)
    |
Item 2           (displacement threshold purge)
    |
Item 3           (yet-renderer shake purge)
    |
Item 4 + Item 5  (parallel - State layer span branch purge)
    |
Item 6           (semantic derivation purge - depends on Items 4-5 settling)
    |
Item 7           (post-save handshake - depends on Item 1)
    |
Item 8           (UI improvement - independent but logical next step)
    |
Item 9a-9d       (future tracks - no dependencies on above)
```

Items 0-1 are the priority. Items 2-6 are Trinity purges that can be done
incrementally. Items 7-8 complete in-progress tracks. Item 9 is future work.