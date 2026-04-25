# Plan: Temporal Engine Unit Fragmentation

- [x] **Task: Extract Era Logic** [856922d]
  - [x] Create `modules/temporal-engine/extract-eras.js`.
  - [x] Port era formatting and sorting from `get-temporal-state.js`.

- [x] **Task: Extract Projection Logic** [eae530e]
  - [x] Create `modules/temporal-engine/project-nodes.js`.
  - [x] Port physical projection and displacement calculation.

- [ ] **Task: Extract Anchoring Logic**
  - [ ] Create `modules/temporal-engine/anchor-segments.js`.
  - [ ] Port virtual anchor creation.

- [ ] **Task: Extract Finalization Logic**
  - [ ] Create `modules/temporal-engine/finalize-state.js`.
  - [ ] Port experience collation and state assembly.

- [ ] **Task: Orchestrator Refactor**
  - [ ] Refactor `modules/temporal-engine/get-temporal-state.js` to use the new units.
  - [ ] Verify that all existing tests pass.
