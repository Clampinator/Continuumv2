# Implementation Plan: Lifeline Core Architecture Reset

## Phase 1: Critical Stability & DOM Fixes
- [x] Task: Fix Dialog 'Zombie' ReferenceError (ca6be79)
- [x] Task: Rip out Interaction Shield (ca6be79)
- [x] Task: Conductor - User Manual Verification 'Phase 1: Critical Stability & DOM Fixes' (Protocol in workflow.md)

## Phase 2: Coordinate & Visual Reset
- [x] Task: Enforce Diagonal Authority (7b16c22)
    - [x] Write Tests: Verify `worldToScreen` projects events accurately upwards and to the right from a bottom-left origin.
    - [x] Implement: Correct the math and `TARGET_RATIO` application in the projection logic so that higher Age and Time values map to smaller Y coordinates on the SVG canvas.
- [x] Task: Implement Responsive Axis Gutters (ede8b7f)
    - [x] Write Tests: Verify that axis rendering logic always outputs exactly 5 or 6 labels regardless of current zoom.
    - [x] Implement: Rewrite `AxisRenderer` (or equivalent grid logic) to dynamically calculate step intervals based on the *visible* screen width/height, explicitly placing 5 or 6 labels spaced evenly across the current view.
- [x] Task: Rebuild Sequential Rails (17c7ced)
    - [x] Write Tests: Verify standard path data strictly connects consecutive events from Birth to NOW.
    - [x] Implement: Strip hardcoded inline styles. Rely on CSS classes. Ensure the engine correctly links Segments (solid blue) and Spans (animated pink dots) end-to-end without horizontal drift.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Coordinate & Visual Reset' (Protocol in workflow.md)

## Phase 3: Interaction Polish
- [x] Task: Implement Drag Threshold (bd80836)
    - [x] Write Tests: Verify dragging state is only engaged after moving >5px.
    - [x] Implement: Track a `startPoint` in `mousedown`. Only shift to `isDragging` and calculate node movement if `Math.hypot(dx, dy) > 5`. 
- [x] Task: Secure Log Event Trigger (edc8ac6)
    - [x] Write Tests: Verify Log Event dialog only opens on `mouseup` if `isDragging` is true.
    - [x] Implement: Ensure the final drop logic exclusively relies on the state machine established by the 5px threshold, preventing accidental clicks from firing the dialog.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Interaction Polish' (Protocol in workflow.md)
