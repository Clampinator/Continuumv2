# Implementation Plan: Lifeline Interaction & Span Physics Refinement

## Phase 1: High-Precision Insertion & Editing
- [ ] Task: Implement Arbitrary Level Rail Insertion
    - [ ] Write Tests: Ensure the math correctly interpolates Age and Time for any given X/Y coordinate strictly on a level rail.
    - [ ] Implement: Enhance `SpanGraphViewport._updateGhostNodeHover` to snap to *any* point on a level rail, not just the midpoint between two nodes. Wire clicking this to open the `event-dialog` in 'insert' mode with the exact coordinates.
- [ ] Task: Implement Context Editing (Right-Click)
    - [ ] Implement: Add a `contextmenu` (right-click) event listener to historical nodes in `SpanGraphViewport`.
    - [ ] Implement: Wire the right-click action to identify the node and open the appropriate dialog (`event-dialog` or `span-dialog`) in 'edit' mode, passing the existing node data.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: High-Precision Insertion & Editing' (Protocol in workflow.md)

## Phase 2: Core Physics Services (The "Bridges")
- [ ] Task: Build Recursive Re-indexer Service
    - [ ] Write Tests: Verify that inserting an event in the middle of history correctly shifts the Subjective Age of all subsequent nodes. Verify that moving a node updates the downstream ages.
    - [ ] Implement: Create a robust `TemporalEngine` service that walks the linked list of events from the point of insertion/edit and recalculates the Age for every subsequent node based on the objective time offsets.
- [ ] Task: Build Collision & Paradox Solver
    - [ ] Write Tests: Verify the engine can detect "Illegal Diagonals" (e.g., a node moved outside its valid chronological order).
    - [ ] Implement: Integrate the solver into the submit/drag flow to block actions that break chronological order.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Core Physics Services' (Protocol in workflow.md)

## Phase 3: Span Physics Constraints
- [ ] Task: Enforce "The Level Breath"
    - [ ] Write Tests: Ensure the validator rejects any Span attempt where the departure Age is equal to the arrival Age of the immediately preceding Span.
    - [ ] Implement: Integrate this validation check into `SpanGraphViewport._handleNodeDrop` (for drag spans) and the `span-dialog` submit flow. Display a lore-accurate UI warning.
- [ ] Task: Enforce "The Span Pool"
    - [ ] Write Tests: Verify the pool capacity is calculated correctly based on Span Rank. Verify consumption logic and accurate resetting upon encountering a "24h Rest" event.
    - [ ] Implement: Create a `SpanPhysicsValidator` service. Integrate it into the span creation/edit flows to block actions exceeding the pool capacity and display warnings. Ensure negative objective time (pre-birth) is handled correctly.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Span Physics Constraints' (Protocol in workflow.md)