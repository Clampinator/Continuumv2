# Implementation Plan: Core Temporal Projection and Robust Insertion Engine

## Phase 1: Foundational Math & Projection [checkpoint: 7299c54]
- [x] Task: Define Temporal Constants and Coordinate Utilities (1ce8278)
    - [ ] Create `modules/temporal-engine/constants.js` with 1:1 Age/Time constants.
    - [ ] Implement `modules/temporal-engine/projection.js` for base rail calculations.
- [x] Task: Implement Segment-Based Projection Logic (39c301c)
    - [ ] Create `modules/temporal-engine/calculate-segments.js` to divide the event stream into chronological Epochs.
    - [ ] Develop `modules/temporal-engine/resolve-coordinates.js` for projecting Age-to-Time within a segment.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundational Math & Projection' (Protocol in workflow.md)

## Phase 2: Stable Insertion & Chronology Management
- [ ] Task: Implement Atomic Insertion Service for Level Events
    - [ ] Develop `modules/temporal-engine/commands/insert-event.js` for non-destructive, bracket-stable insertion.
    - [ ] Implement Sort-Value Gapping to prevent chronological collisions.
- [ ] Task: Implement Robust Span Insertion & Propagation
    - [ ] Develop `modules/temporal-engine/commands/insert-span.js` with automatic downward propagation of objective offsets.
    - [ ] Implement Diagonal Preservation logic to project manual overrides onto the rail.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Stable Insertion & Chronology Management' (Protocol in workflow.md)

## Phase 3: Integration & Validation
- [ ] Task: Create Unified Temporal State Middleware
    - [ ] Implement `modules/temporal-engine/get-temporal-state.js` to provide a read-only, unified state to UI/System.
    - [ ] Integrate Span Pool Ledger for real-time cost calculation.
- [ ] Task: Validate Insertion Resilience
    - [ ] Perform stress-testing on nested insertions (Event inside Span, Span inside Span).
    - [ ] Verify that "The Yet" fulfillment correctly triggers the insertion engine.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Integration & Validation' (Protocol in workflow.md)
