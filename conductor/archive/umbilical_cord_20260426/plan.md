# Plan: The Umbilical Cord & Precision Handshake

## Phase 1: Purify the Data Layer
- [ ] Task: Audit and remove all `Date.getTime()` and physical coordinate math from `modules/state/get-actor-history.js`.
- [ ] Task: Ensure `getActorHistory` returns only raw facts and strips/ignores legacy `age`/`ts` fields from the DB.
- [ ] Task: Update tests for `get-actor-history.js` to assert it only returns raw strings and facts.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Purify the Data Layer' (Protocol in workflow.md)

## Phase 2: Establish The Timezone Law
- [ ] Task: Create `modules/temporal-kernel/resolve-active-location.js` to implement the Reverse History Walk for a given node.
- [ ] Task: Create `modules/temporal-kernel/resolve-location-timezone.js` to map a location/coordinates to a Timezone string (fallback to Birth Location or UTC).
- [ ] Task: Write tests for both timezone resolution Kernel laws.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Establish The Timezone Law' (Protocol in workflow.md)

## Phase 3: The Precision Handshake
- [ ] Task: Refactor `modules/lifeline/services/ui/event-dialog/handle-submit.js` to establish the Active Timezone for the incoming edit.
- [ ] Task: In `handle-submit.js` (or a dedicated submission unit), convert the UI's date/time strings into mathematical objective timestamps using the Active Timezone.
- [ ] Task: Update `modules/state/update-history-row.js` and `insert-history-row.js` to accept and write these pure facts/timestamps without doing their own inline physics.
- [ ] Task: Write/update tests for the submission and state-write pipeline.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: The Precision Handshake' (Protocol in workflow.md)

## Phase 4: Engine Physics Authority
- [ ] Task: Create `modules/temporal-kernel/establish-history-physics.js` as the sole authority that calculates `x`, `y`, `arrivalY` from the raw fact strings.
- [ ] Task: Refactor `modules/temporal-engine/get-temporal-state.js` to pipe the raw facts through `establishHistoryPhysics` before projection.
- [ ] Task: Update `get-temporal-state` tests to pass raw facts and expect correct physical coordinate outputs.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Engine Physics Authority' (Protocol in workflow.md)