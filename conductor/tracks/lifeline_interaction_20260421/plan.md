# Implementation Plan: Lifeline Interaction & Creation Toolkit

## Phase 1: Test Suite Repair
- [ ] Task: Fix SVG Prepend Errors
    - [ ] Write Tests: Identify failing tests missing `prepend` in DOM mocks.
    - [ ] Implement: Add `prepend` to the `document.createElementNS` SVG mock in `tests/span-graph/viewport.test.js`, `navigation.test.js`, and `transitions.test.js`.
- [ ] Task: Fix Projection Mismatches
    - [ ] Write Tests: Ensure `worldToScreen` and `screenToWorld` correctly factor in zoom instead of hardcoded scale constants.
    - [ ] Implement: Update the mathematical projection logic in `modules/temporal-engine/projection.js` to match the expected arithmetic.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Test Suite Repair' (Protocol in workflow.md)

## Phase 2: Functional NOW Node
- [ ] Task: Implement Dynamic Tooltips
    - [ ] Write Tests: Verify that dragging updates the view state with the projected date and age.
    - [ ] Implement: Update the `span-graph-interactions` to calculate and render a dynamic tooltip on the NOW node during drag.
- [ ] Task: Implement NOW Node Drop Interactions (Create/Update)
    - [ ] Write Tests: Verify dropping on an empty rail opens the Log Event dialog. Verify dropping on an existing event triggers an age update.
    - [ ] Implement: Wire `process-hover-state.js` and the `NodeRenderer` drag end handlers to fire the appropriate callbacks for event creation and age updating.
- [ ] Task: Implement Create Span
    - [ ] Write Tests: Verify a vertical drag threshold initiates span creation mode.
    - [ ] Implement: Add vertical threshold detection and trigger the Span dialog flow upon release.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Functional NOW Node' (Protocol in workflow.md)

## Phase 3: Creation Bars & Ghost Nodes
- [ ] Task: Implement Horizontal Drag for Eras
    - [ ] Write Tests: Verify that horizontal dragging on the timeline axis captures a start and end age.
    - [ ] Implement: Add interaction listeners on the bottom X-axis to capture dragging bounds and open the Era creation dialog.
- [ ] Task: Implement Ghost Nodes
    - [ ] Write Tests: Verify ghost nodes appear mathematically halfway between existing events on hover.
    - [ ] Implement: Calculate hover insertion points and render an interactive SVG ghost node, wiring click events to the Log Event dialog.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Creation Bars & Ghost Nodes' (Protocol in workflow.md)
