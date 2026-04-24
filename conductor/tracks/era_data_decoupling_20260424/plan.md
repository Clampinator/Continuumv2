# Implementation Plan: Era Data Decoupling

## Phase 1: Engine Data Extraction
- [x] Task: Update Temporal Engine to Gather Eras (14bea2b)
    - [ ] Modify `get-temporal-state.js` to iterate over `actor.system.eras`.
    - [ ] Calculate the `startAge` of each era sequentially based on the database's provided order.
    - [ ] Append a pre-calculated `eras` array to the final returned state object: `[{ name, startAge, duration, color }]`.
- [x] Task: Add Era Extraction Tests (14bea2b)
    - [ ] Write unit tests for `get-temporal-state.js` to verify it correctly maps and calculates the start ages of multiple eras from the actor object into the `state.eras` array.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Engine Data Extraction' (Protocol in workflow.md)

## Phase 2: Projector Manifest Refactoring
- [ ] Task: Update Manifest Generator
    - [ ] Modify `manifest-generator.js` to completely remove any reference to `viewport.actor.system.eras`.
    - [ ] Refactor the "PROJECT ERAS" section to iterate exclusively over the new `state.eras` array.
    - [ ] Implement Defensive Rendering: Ensure graceful skipping if `state.eras` is missing, and apply safe fallbacks for missing duration/color properties.
- [ ] Task: Add Manifest Era Tests
    - [ ] Write unit tests for `manifest-generator.js` to verify that `manifest.eras` is correctly populated based strictly on the provided `state.eras` object, including defensive fallbacks.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Projector Manifest Refactoring' (Protocol in workflow.md)