# Implementation Plan: Codebase Stabilization & Architectural Integrity

## Phase 1: Architectural Detox
- [ ] Task: Audit & Unify Pointer Machine
    - [ ] Review: Analyze `SpanGraphViewport` interaction handlers (`_onPointerDown`, `_onPointerMove`, `_onPointerUp`) against the baseline `f7a80ee` commit.
    - [ ] Implement: Remove any isolated DOM patches (like `interactionGroup`) that introduced interaction fragility. Restore a single, authoritative rendering group model. Ensure dragging is fluid and strictly math-bound.
- [ ] Task: Consolidate Rendering Authority
    - [ ] Review: Ensure the sequence in `_render()` is strictly data-driven (`Grid` -> `Eras` -> `Experiences` -> `Rails` -> `Nodes`).
    - [ ] Implement: Verify that `NodeRenderer.js` draws all nodes end-to-end without conditionally skipping elements, and handles active dragging flawlessly without secondary overlays.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Architectural Detox' (Protocol in workflow.md)

## Phase 2: Data Model Consistency
- [ ] Task: Audit Coordinate Persistence
    - [ ] Review: Ensure `handleSubmit.js` explicitly saves high-precision `ts` and `age` directly to the database without relying on string-based date parsing for new/edited nodes.
    - [ ] Implement: Verify `flattenEvents` in `span-graph-data-processor.js` correctly prioritizes these stored high-precision coordinates over any fallback parsing, preventing "insertion drift" natively.
- [ ] Task: Consolidate Temporal Engine
    - [ ] Implement: Audit `get-temporal-state.js` to ensure the projection math accurately incorporates high-precision coordinates and correctly resolves the Segment Anchors and Directionality.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Data Model Consistency' (Protocol in workflow.md)

## Phase 3: Stress Testing
- [ ] Task: Interaction Integration Test
    - [ ] Implement: Verify that NOW dragging, Experience rendering, and Ghost Node hover/insertion all function simultaneously without regression, visual glitches, or console errors.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Stress Testing' (Protocol in workflow.md)