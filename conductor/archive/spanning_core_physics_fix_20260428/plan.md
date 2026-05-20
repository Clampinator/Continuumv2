# Implementation Plan: Spanning Core Physics Fix

## Objective
Identify and kill the "hacks" causing Span snapback and property name discrepancies.

## Implementation Steps

### Phase 1: Audit & Deep Search
- [ ] **Task: Property Name Discrepancy Audit**
    1. Search for all occurrences of `.age`, `.time`, `.eventAge`, `.eventTime`, `.ts`, `.arrivalTs`, `.y`, `.arrivalY` in the following folders:
       - `modules/span-graph/`
       - `modules/temporal-engine/`
       - `modules/temporal-kernel/`
       - `modules/state/`
    2. Identify and document any places where these are being mixed or assigned incorrectly.

- [ ] **Task: Locate the "Snapback Hack"**
    1. Specifically audit `modules/span-graph/viewport.js` and `modules/temporal-kernel/establish-history-physics.js`.
    2. Look for any logic that calculates the NOW node's age by subtracting `originTime` from `objectiveNow` without considering intervening Spans.

### Phase 2: Logic Correction
- [ ] **Task: Standardize the Physics Handshake**
    1. Ensure `getActorHistory` correctly captures `objectiveNow` from the database.
    2. Ensure `insertHistoryRow` explicitly updates BOTH `objectiveNow` and `subjectiveNow` when a Span is logged.
    3. Update `establishHistoryPhysics` to use the standardized property names for its internal walk.

- [ ] **Task: Fix Viewport Virtual History Injection**
    1. Update `Viewport._render()` to inject the "Live Drag" facts using the correct `eventAge` and `eventTime` property names.

### Phase 3: Handshake Hardening
- [ ] **Task: Create "Precision Handshake" Test**
    1. Write a test in `tests/temporal-kernel/` that simulates a Span followed by multiple events.
    2. Verify that the final NOW node remains anchored to the correct, non-birth rail.

## Validation Checklist
- [ ] **Zero Discrepancies:** `grep` for legacy property names returns zero matches in active logic files.
- [ ] **Permanent Fix:** Spanning up/down and clicking "Save" results in the NOW node staying at the arrival point.
- [ ] **No Regression:** Subsequent level drags start from the Span arrival point.
