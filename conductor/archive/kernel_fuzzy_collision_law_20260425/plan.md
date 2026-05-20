# Plan: Kernel Fuzzy Collision Law

- [x] **Task: Extract Collision Logic**
  - [x] Create `modules/temporal-kernel/apply-collision-laws.js`.
  - [x] Port merging logic from `get-temporal-state.js`.
  - [x] Implement priority rule: Span Destination > Level Event / Span Origin.

- [x] **Task: Refactor Temporal Engine**
  - [x] Import `applyCollisionLaws` in `modules/temporal-engine/get-temporal-state.js`.
  - [x] Replace inline collation logic with kernel call.

- [x] **Task: Verification**
  - [x] Create `tests/temporal-kernel/apply-collision-laws.test.js`.
  - [x] Verify "swallowing" behavior for level events and span origins.
  - [x] Update and verify `tests/temporal-engine/get-temporal-state.test.js`.
