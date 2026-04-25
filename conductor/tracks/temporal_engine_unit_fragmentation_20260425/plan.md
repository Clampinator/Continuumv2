# Plan: Temporal Engine Unit Fragmentation

- [x] **Task: Extract Era Logic** [856922d]
  - [x] Create `modules/temporal-engine/extract-eras.js`.
  - [x] Port era formatting and sorting from `get-temporal-state.js`.

- [x] **Task: Extract Projection Logic** [eae530e]
  - [x] Create `modules/temporal-engine/project-nodes.js`.
  - [x] Port physical projection and displacement calculation.

- [x] **Task: Extract Anchoring Logic** [901eab7]
  - [x] Create `modules/temporal-engine/anchor-segments.js`.
  - [x] Port virtual anchor creation.

- [x] **Task: Extract Finalization Logic** [830ecbd]
  - [x] Create `modules/temporal-engine/finalize-state.js`.
  - [x] Port experience collation and state assembly.

- [x] **Task: Orchestrator Refactor** [6cb673a]
  - [x] Refactor `modules/temporal-engine/get-temporal-state.js` to use the new units.
  - [x] Verify that all existing tests pass.
