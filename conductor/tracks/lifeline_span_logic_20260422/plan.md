# Implementation Plan: Lifeline Span Logic & Dialog Implementation

## Phase 1: Interaction Architecture
- [x] Task: Implement `openSpanDialog` Service (f92daf9)
    - [x] Write Tests: Ensure the service correctly captures `startWorld` (departure) and `currentWorld` (arrival) data without throwing ReferenceErrors on close.
    - [x] Implement: Create a clean V13 `openSpanDialog` function that handles dialog rendering and state cleanup, modeled after the stabilized `openEventDialog`.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Interaction Architecture' (Protocol in workflow.md)

## Phase 2: High-Fidelity Span Form & Engine
- [x] Task: Develop Span Result Handlebars Template (f92daf9)
    - [x] Write Tests: N/A - Visual template validation required.
    - [x] Implement: Construct `span-result-dialog.html`. Include fields for: **Span Rank, Down-Time, Frag, Arrival Date, Span Cost, 24-Hour Rest Toggle, and SpaceTime Map Hooks**.
- [x] Task: Implement Span Math & Submission Logic (f92daf9)
    - [x] Write Tests: Verify that Span Cost is accurately calculated using `Math.abs(arrival - departure)` and the strict year constant.
    - [x] Implement: Write the submission handler that calculates the final metrics, links the SpaceTime coordinates, processes the 24-Hour Rest toggle, and updates the actor's history.
- [x] Task: Conductor - User Manual Verification 'Phase 2: High-Fidelity Span Form & Engine' (Protocol in workflow.md)

## Phase 3: Physics Bridge
- [x] Task: Wire Viewport to Span Dialog (f92daf9)
    - [x] Write Tests: Verify `_handleNowNodeDrop` routes to `openSpanDialog` if `viewState.activeDragType === 'span'`.
    - [x] Implement: Update `SpanGraphViewport._onPointerUp` to inspect the final locked axis mode and trigger the appropriate dialog (Event vs. Span), passing the correct departure and arrival coordinates.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Physics Bridge' (Protocol in workflow.md)
