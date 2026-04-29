# Live Insert-Span Displacement During Drag

**Date:** 2026-04-30
**Track:** Spanning Core Physics
**Status:** Approved

## Problem

When a user drags out an inserted span (click on rail, drag vertically), the pink dashed span line and HUD tooltip appear correctly, but all other nodes, rails, and experiences remain frozen at their pre-insertion positions. They should shift in real time as the displacement changes during drag, giving the user immediate visual feedback of the time displacement they are creating.

The shift currently only happens after the dialog is confirmed and the database is updated, causing a jarring "pop" of all elements to their new positions.

## Architecture Context

The Trinity architecture separates State, Kernel, and Projector:

- **State** (`modules/state/`): Holds the flat history array, the single source of truth
- **Kernel** (`modules/temporal-kernel/`): Pure functions enforcing Continuum physics
- **Projector** (`modules/span-graph/`): Dumb renderers that turn a manifest into pixels

The unbreakable loop is: User action -> Projector converts pixel to age/time -> Kernel validates -> DB updates -> Projector redraws from new DB state.

For live displacement during drag, we do NOT write to the DB. Instead, we compute a projection overlay: the Kernel calculates what the displacement WOULD be, and the Projector renders the manifest with that displacement applied to node positions. This is already how the system IS designed - the code exists but is not producing visible results.

## Current Code State

The following code already exists and executes during insert-span drag:

1. **`pointer-machine.js:140-179`** (`_handleInsertSpanDrag`): Computes `displacementResult` on every pointer move, writes to `viewport._interaction`, and calls `viewport._render()`
2. **`manifest-generator.js:47-60`**: When `isInsertSpan` is true, calls `applyInsertionShift()` to produce `shiftedNodes`
3. **`manifest-generator.js:159-262`**: Splits the splice segment and shifts after-splice segments by displacement `d`
4. **`manifest-generator.js:313`**: Uses `shiftedNodes` for node projection
5. **`apply-insertion-shift.js`**: Pure function shifting Y coordinates of nodes after insertion age

The HUD and pink span line ARE visible during drag, proving the `isInsertSpan` code path executes. The bug is that shifted node/rail positions are not rendering correctly.

## Root Cause Hypothesis

The most likely failure points (in order of probability):

1. **`applyInsertionShift` returns the unmodified array** - either `displacement` is 0, or the age comparison threshold (`insertionAge + 0.001`) fails to match any nodes
2. **Segment index mismatch** - `displacementData.segmentIndex` doesn't match actual segment indices, causing the splice/after-splice code paths to not match
3. **`shiftedNodes` is computed but not propagated** correctly through the node mapping at line 315-327
4. **Rail nodes use `state.nodes` instead of `shiftedNodes`** for some code paths

## Implementation Plan

### Phase 1: Debug Logging

Add targeted console logging to trace the exact data flowing through the live displacement path:

**In `pointer-machine.js` _handleInsertSpanDrag:**
- Log `displacementResult` values: displacement, departureAge, departureTime, arrivalTime, isUpSpan, isDownSpan
- Log the number of history nodes being passed to `calculateInsertionDisplacement`

**In `manifest-generator.js` generateManifest:**
- Log whether `isInsertSpan` is true
- Log whether `displacementResult` and `insertionContext` are present
- Log the `shiftedNodes` count vs `state.nodes` count and whether any nodes actually changed position
- Log the `displacementData` object
- Log which segments are identified as before/splice/after

### Phase 2: Identify and Fix Bug

Run the system in Foundry VTT, trigger an insert-span drag, and examine console output. Based on the logs, identify which link in the chain is broken and fix it.

Expected fixes based on hypothesis:

- **If displacement is 0**: Check `calculateInsertionDisplacement` - the `arrivalTime` parameter may be wrong
- **If applyInsertionShift finds no nodes to shift**: The age comparison may be off (the threshold `insertionAge + 0.001` may not match any node ages in the projected coordinate space)
- **If segment indices mismatch**: The `segmentIndex` from `computeSplicePoint` may not align with the segments from `getTemporalState`

### Phase 3: Fix Rail Renderer `isInserting` Class

The CSS class `.span-graph-span-line.inserting` exists in `rail-renderer.js` but is never applied. The manifest generates `isInserting: true` on span rails but `rail-renderer.js` only checks `rail.isFuture`, never `rail.isInserting`. Add:

```javascript
if (rail.isInserting) el.classList.add('inserting');
```

in the span rendering path (after the `isFuture` class check).

### Phase 4: Verify and Clean Up

- Verify all nodes after the insertion point shift smoothly in real time during drag
- Verify rails split correctly at the departure point and resume at the arrival point
- Verify experiences after the insertion point shift in real time
- Verify up-spans and down-spans both work
- Verify the "pop" at acceptance is gone (positions should already be correct)
- Remove all debug logging

## Affected Files

| File | Change |
|------|--------|
| `modules/span-graph/interaction/pointer-machine.js` | Debug logging in `_handleInsertSpanDrag` |
| `modules/span-graph/projection/manifest-generator.js` | Debug logging + potential bug fix |
| `modules/temporal-kernel/apply-insertion-shift.js` | Potential bug fix in age comparison |
| `modules/span-graph/renderers/rail-renderer.js` | Add `isInserting` class application |
| `modules/temporal-kernel/calculate-insertion-displacement.js` | Potential bug fix |

## Testing

- Unit test: `applyInsertionShift` with known inputs produces correct shifted array
- Unit test: `calculateInsertionDisplacement` returns non-zero displacement for drag
- Integration test: manifest generator with `isInsertSpan=true` interaction produces shifted node positions
- Visual test in Foundry: drag insert-span and verify nodes shift in real time
- Visual test: nodes "pop" no longer occurs on dialog confirm
- Edge case: down-span (negative displacement) shifts nodes upward
- Edge case: inserting near the end of the lifeline (no after-nodes)

## Success Criteria

1. During insert-span drag, all nodes after the departure point shift in real time proportional to the drag distance
2. Rails split at departure and resume at arrival, with after-nodes shifted
3. Experiences after the departure point shift in real time
4. No "pop" when the span is confirmed (positions are already correct)
5. Down-spans (negative displacement) shift nodes upward in real time
6. All debug logging is removed before commit