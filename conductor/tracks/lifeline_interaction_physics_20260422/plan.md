# Implementation Plan: Lifeline NOW Node Interaction & Span Physics Rebuild

## Phase 1: Node Typography (Shapes & Colors)
- [x] Task: Rebuild `createNodeShape` Logic (994ed87)
    - [x] Write Tests: Ensure `nodeData.isSpanOrigin` and `isSpanDest` return correct SVG polygon (triangle) and path (semi-circle) elements with proper directionality.
    - [x] Implement: Refactor `modules/span-graph/renderers/node-renderer.js` to match the exact shape-generation logic from the legacy codebase (using SVG triangles for origin, semi-circles for dest, circles for level).
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Node Typography (Shapes & Colors)' (Protocol in workflow.md)

## Phase 2: Drag Constraint Physics
- [ ] Task: Implement Axial Locking
    - [ ] Write Tests: Verify that dragging horizontal/diagonal constraints the point exactly to the 30-degree Target Ratio line, and vertical constraints strictly lock the X-axis (Subjective Age).
    - [ ] Implement: Audit `modules/span-graph/actions/drag-physics.js` and `getDragMode` / `constrainMovement`. Guarantee the mathematical lock on the NOW node's position during movement. Ensure no premature dialog triggers.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Drag Constraint Physics' (Protocol in workflow.md)

## Phase 3: Dynamic Drag Rendering
- [ ] Task: Connect the Drag Line
    - [ ] Write Tests: Verify the rail renderer outputs dynamic line data (cyan continuous or pink dotted) corresponding to `viewState.activeDragType`.
    - [ ] Implement: Modify `RailRenderer` in `modules/span-graph/renderers/rail-renderer.js` to visually update the trailing 'Log Line' from the last event to the NOW node dynamically on every `mousemove` frame based on the locked axis.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Dynamic Drag Rendering' (Protocol in workflow.md)
