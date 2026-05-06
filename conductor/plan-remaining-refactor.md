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

### Problem
`pointer-machine.js:406` has a hard-coded `60000` (1-minute) displacement
threshold that cancels span insertion for near-zero drags. This is a Kernel
decision (business rule) sitting in the UI/interaction layer. Trinity violation.

### Fix
- Add `MIN_SPAN_DISPLACEMENT_MS = 60000` constant to
  `modules/temporal-engine/constants.js`.
- Move the threshold check into `validateSpanPhysics()` in
  `modules/temporal-kernel/validate-span-physics.js`.
- `validateSpanPhysics` already receives `proposed` (with y/arrivalY) and can
  compute displacement. Add a new validation rule.
- `pointer-machine.js:_commitInsertSpan()` removes the `displacement < 60000`
  check and instead relies on `validateSpanPhysics` returning `isValid: false`
  for zero-displacement spans (which it should already reject since they are
  not meaningful spans).
- Actually: zero-displacement spans fail `hasSpanFacts` in the dialog submit
  anyway. The `60000` threshold is just a UX guard against accidental clicks.
  The simplest Kernel-consistent approach: move it to `validateSpanPhysics` as
  a warning-level check, or keep it as a UI interaction guard but comment
  it as "UX guard, not physics rule."

### Decision Needed
Is the 60000ms threshold a PHYSICS rule (spans below 1 minute are physically
meaningless) or a UX guard (preventing accidental clicks from opening dialogs)?
This determines whether it goes to Kernel or stays in the interaction layer
with a comment.

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

### Problem
`yet-renderer.js:79-82` computes shake amplitude and duration from `frag` count
inside the renderer:

```js
const amp = Math.min(12, 4 + yet.frag * 1.5);
const dur = Math.max(0.12, 0.35 - yet.frag * 0.02);
```

This is logic (not pure coordinate conversion) in the Projector layer. Trinity
violation: the renderer is deciding HOW MUCH to shake based on raw data, rather
than receiving pre-computed shake parameters from the manifest.

### Fix
- Add `computeYetShakeParams(frag)` to `modules/temporal-kernel/yet-physics.js`.
  Returns `{ shakeAmplitude: number, shakeDuration: string }`.
- `resolveYetNodes` in `yet-physics.js` already processes each Yet node. Add
  the shake params to the resolved Yet node objects.
- `manifest-generator.js` passes shake params through to `yetNodes`.
- `yet-renderer.js` reads `yet.shakeAmplitude` and `yet.shakeDuration` instead
  of computing them.

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

### Problem
`insert-history-row.js` has several `if(data.eventIsSpan)` branches that make
decisions about HOW to process the record based on its type. The State layer
should not be branching on domain semantics. Examples:

- Line 33: `if (data.eventIsSpan) { console.warn('[INSERT-SPAN]...') }` - debug
  logging gated on span. Not harmful but sets a pattern.
- Line 131-134: `if (options.isLog)` block that sets `objectiveNow` differently
  for spans vs levels. This IS state-level routing (determining which timestamp
  to use for NOW) but the SPAN vs LEVEL decision should come from the Kernel.

### Fix
- Debug logging: remove span-specific debug blocks or make them generic.
- NOW update logic (line 133): The rule "NOW = arrivalTs for spans, ts for levels"
  should come from `validateSpanPhysics` or a new Kernel function
  `computeNowPosition(atomic)` that returns `{ objectiveNow, subjectiveNow }`.
- Replace the inline ternary with a Kernel call.

### Files
- `modules/state/insert-history-row.js` (remove span-specific branches)
- `modules/temporal-kernel/compute-now-position.js` (NEW - Kernel function)

### Tests
- `computeNowPosition(levelEvent)` returns `{ objectiveNow: ts, subjectiveNow: age }`.
- `computeNowPosition(spanEvent)` returns `{ objectiveNow: arrivalTs, subjectiveNow: age }`.
- Insert tests: both span and level events produce correct NOW updates.

---

## Item 5: Purge `if(eventIsSpan)` Decision Logic from update-history-row.js

### Problem
`update-history-row.js` has span-specific branching:

- Lines 27-43: `_editArrivalOnly` reconstruction - rebuilds full span data when
  the user edits just the arrival node. This is a data reconstruction rule, not
  state logic.
- Lines 56-61: Departure delta preservation - when editing departure, moves
  arrival by the same delta. This is a PHYSICS rule (span duration conservation)
  sitting in the State layer.

### Fix
- Departure delta preservation: move to `validateSpanPhysics` or a new Kernel
  function `adjustSpanOnDepartureEdit(atomic, oldRecord)` that returns the
  corrected `arrivalTs`.
- `_editArrivalOnly` reconstruction: move to the interaction/dialog layer. The
  dialog should assemble the complete data object before calling State.

### Files
- `modules/state/update-history-row.js` (remove span branches)
- `modules/temporal-kernel/adjust-span-departure.js` (NEW - Kernel function)
- `modules/lifeline/services/ui/event-dialog/` (dialog assembles full data)

### Tests
- `adjustSpanOnDepartureEdit` preserves span duration when departure shifts.
- `adjustSpanOnDepartureEdit` with zero delta returns unchanged arrivalTs.

---

## Item 6: Purge Semantic Derivation from get-actor-history.js

### Problem
`get-actor-history.js` line 76 derives `isRestEnd: Boolean(event.isRestEnd)` from
the raw event data. This is a semantic classification (deciding what KIND of node
this is) that belongs in the Kernel, not the State layer. State should report
raw facts; Kernel classifies them.

Similarly, line 75: `eventIsRest: Boolean(event.eventIsRest)` - the State layer
is normalizing data. While boolean coercion is arguably harmless, it establishes
a pattern where the State layer interprets data rather than just passing it through.

### Fix
- `get-actor-history.js`: report raw values without boolean coercion. Pass
  `eventIsRest: event.eventIsRest, isRestEnd: event.isRestEnd` (preserve original
  types: boolean, undefined, null, whatever).
- `establish-history-physics.js` already handles the classification with
  `isRest = !!record.eventIsRest && !eventIsSpan`. Keep this in Kernel.
- Other consumers that read `record.eventIsRest` already use `Boolean()` at
  point-of-use. Ensure no consumer breaks if `eventIsRest` can be `undefined`
  instead of `false`.

### Files
- `modules/state/get-actor-history.js` (remove Boolean coercion from mapToFact)

### Tests
- Verify all downstream consumers handle `undefined` the same as `false`.
- Add test: `getActorHistory` for event without `isRestEnd` field does NOT add it.

---

## Item 7: Spanning Core Physics Phase 3 - Post-Save Handshake

### Problem
After a span event is saved, there is no verification that the DB integers match
the visual coordinates the user saw during the drag. A drift in the TTL round-trip
could silently place the event at a different position.

### Fix
- Add a post-save validation step in the engine: after `insertHistoryRow` or
  `updateHistoryRow` commits a span, read the committed record back and compare
  its `ts`/`arrivalTs` against the target values from the interaction state.
- If drift exceeds a tolerance (e.g., 1000ms), log a warning and/or offer to
  correct.
- This is a DEFENSE mechanism, not a correction loop. It should never fire in
  normal operation.

### Files
- `modules/temporal-engine/commands/insert-span.js` (add post-save verification)
- `modules/state/insert-history-row.js` (return committed record for verification)

### Tests
- Simulate a save with exact `ts`, verify post-save check passes.
- Simulate drift (mock TTL returning different ts), verify warning fires.

---

## Item 8: Historical Span Insertion Phase 3 - UI

### Problem
The Insert Span dialog needs to show before/after objective times for the
insertion point, so the user can see the downstream impact before committing.
Currently the dialog just shows departure/arrival fields without context.

### Fix
- Add a "Downstream Impact" preview section to the span dialog template.
- When the dialog loads with insertion context, request `buildPreviewHistory` to
  get the projected state and display affected events with their time shifts.
- Show: "Event X: 2000-01-01 12:00 -> 2000-01-01 14:00 (+2h)"

### Files
- `templates/dialogs/span-result-dialog.html` (add impact preview section)
- `modules/lifeline/services/ui/span-dialog/open-span-dialog.js` (compute preview)
- `modules/span-graph/projection/manifest-generator.js` (might need preview data)

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