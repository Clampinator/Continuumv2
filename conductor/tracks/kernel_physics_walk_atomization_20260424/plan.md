# Implementation Plan: Kernel Physics Walk Atomization

## Phase 1: Mathematical Extraction [checkpoint: a65887b]
- [x] Task: Create `project-subjective-age.js` (ce9cc2e)
    - [x] Create the file in the `modules/temporal-kernel/` directory.
    - [x] Implement the `projectSubjectiveAge(timestamp, offset)` pure function based on the "Diagonal Authority" (1s Age = 1000ms Time).
- [x] Task: Create `calculate-span-displacement.js` (faa7a29)
    - [x] Create the file in the `modules/temporal-kernel/` directory.
    - [x] Implement the `calculateSpanDisplacement(departureTs, arrivalTs)` pure function to determine the objective time gap.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Mathematical Extraction' (Protocol in workflow.md)

## Phase 2: Orchestrator Refactoring
- [ ] Task: Refactor `solve-history-physics.js`
    - [ ] Update `solve-history-physics.js` to import the two newly created atomic math functions.
    - [ ] Delegate the age calculation and the span displacement math to these pure functions.
    - [ ] Ensure the file retains its role as a "Pure Orchestrator," focusing only on iterating through history nodes and accumulating shifts and clock offsets.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Orchestrator Refactoring' (Protocol in workflow.md)

## Phase 3: Verification Tests
- [ ] Task: Create Math Unit Tests
    - [ ] Create the test file `tests/temporal-kernel/project-subjective-age.test.js`.
    - [ ] Write unit tests verifying standard age calculations, negative age protection, and missing inputs.
    - [ ] Create the test file `tests/temporal-kernel/calculate-span-displacement.test.js`.
    - [ ] Write unit tests verifying span difference calculation (forward and backward jumps).
- [ ] Task: Create Orchestrator Integration Tests
    - [ ] Create the test file `tests/temporal-kernel/solve-history-physics.test.js`.
    - [ ] Write unit tests verifying the orchestrator correctly calculates and returns shifts using the delegated math units.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Verification Tests' (Protocol in workflow.md)