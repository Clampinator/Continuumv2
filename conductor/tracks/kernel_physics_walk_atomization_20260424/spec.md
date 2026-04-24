# Specification: Kernel Physics Walk Atomization

## Overview
This track decimates the monolithic `solve-history-physics.js` file into atomic Kernel units. By extracting the mathematical formulas for Age Projection and Span Displacement into their own dedicated files, we adhere strictly to the Function-Per-File (FPF) mandate and transform the main solver into a pure orchestrator.

## Functional Requirements
1.  **Extract Age Projection**: Create a new file `project-subjective-age.js` in the `modules/temporal-kernel/` directory. This file must contain a pure function that calculates a character's subjective age based on the objective timestamp and an offset (implementing the "Diagonal Authority" where 1s Age = 1000ms Time).
2.  **Extract Span Displacement**: Create a new file `calculate-span-displacement.js` in the `modules/temporal-kernel/` directory. This file must contain a pure function that determines the objective time gap (in milliseconds) created by a span jump.
3.  **Refactor Orchestrator**: Update `solve-history-physics.js` to act as a "Pure Orchestrator". It must delegate all mathematical calculations to the newly created files and focus solely on walking the history array and updating the clock offsets.

## Non-Functional Requirements
-   **Strict FPF Compliance**: The extracted math functions must reside in distinct files.
-   **Test Coverage**: New unit tests must verify the pure mathematical logic of both new files.
-   **Stability Verification**: The refactoring must not alter the external behavior of the Compensation Wave.

## Acceptance Criteria
-   [ ] **Code Quality**: `solve-history-physics.js` contains no inline math for age or displacement calculations.
-   [ ] **Test Verification**: Unit tests for the new files pass.
-   [ ] **Visual Fidelity**: Editing an event's date correctly triggers the Compensation Wave, shunting all downstream nodes horizontally on the graph.

## Out of Scope
-   Modifying the logic of how the graph resolves overlapping nodes.
-   Stripping the initial timestamp parsing from the Data Layer.