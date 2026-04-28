# Plan: Data Layer Purification (Fact-Only Architecture)

## Phase 1: Purify the Data Layer [checkpoint: 8d1bbae]
- [x] Task: Refactor `modules/state/get-actor-history.js` to strip all coordinate math (`Date.getTime()`, `x`, `y`, `arrivalY`) and return only raw facts. [33efa4d]
- [x] Task: Update the automated tests for `get-actor-history.js` to ensure it only returns raw strings and ignores legacy physics properties. [33efa4d]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Purify the Data Layer' (Protocol in workflow.md)

## Phase 2: Engine Physics Authority [checkpoint: ee201de]
- [x] Task: Create `modules/temporal-kernel/establish-history-physics.js` in the Kernel to be the sole authority that converts the raw fact strings back into physical coordinates (`x`, `y`, `arrivalY`). [cce5636]
- [x] Task: Update the `modules/temporal-engine/get-temporal-state.js` orchestrator to pipe the raw facts through `establishHistoryPhysics` before projecting nodes onto segments. [ee201de]
- [x] Task: Update the automated tests for `get-temporal-state.js` and the new `establish-history-physics.js` module. [ee201de]
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Engine Physics Authority' (Protocol in workflow.md)

## Phase 3: The Precision Handshake (UI to Kernel to DB)
- [ ] Task: Create `modules/temporal-kernel/resolve-active-location.js` and `resolve-location-timezone.js` to establish the "Active Timezone" context based on a Reverse History Walk.
- [ ] Task: Refactor `modules/lifeline/services/ui/event-dialog/handle-submit.js` (UI) to gather raw UI input data (dates, times, locations), find the Active Timezone, and convert to mathematical timestamps via the Kernel's `parseObjectiveTimestamp`.
- [ ] Task: Refactor `modules/state/update-history-row.js` and `insert-history-row.js` (State) to consume the translated UI inputs and timestamps without performing their own inline physics or coordinate math.
- [ ] Task: Ensure all tests related to persistence, timezone resolution, and submission are updated and passing.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: The Precision Handshake' (Protocol in workflow.md)
