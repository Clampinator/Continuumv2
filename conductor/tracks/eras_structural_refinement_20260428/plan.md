# Implementation Plan: Eras Structural Refinement

## Objective
Implement the structural logic and visual grouping for Eras in the Lifeline tool.

## Implementation Steps

### Phase 1: Engine Logic
- [ ] **Task: Implement Era Duration Calculation in `Temporal Engine`**
    - Ensure `getTemporalState` accurately calculates the `startAge` and `endAge` for each Era.
    - Verify that Era bounds perfectly encapsulate their experiences and events.
- [ ] **Task: Enforce Downward Propagation**
    - When an event is added to Era 1, ensure Era 2's `startAge` is updated throughout the state object.

### Phase 2: Projection & Rendering
- [ ] **Task: Implement Era Metadata in `manifest-generator.js`**
    - Identify the start and end screen X coordinates for each Era.
- [ ] **Task: Create `EraRenderer.js`**
    - Implement SVG drawing logic for Era labels and background "striping" to group chronological sections.
    - Ensure labels are positioned to avoid overlap.

### Phase 3: UI & Navigation
- [ ] **Task: Implement Era-Based Autofocus**
    - Update `auto-center.js` or the Viewport to support jumping to a specific Era ID.
- [ ] **Task: Refactor Era Management Dialogs**
    - Ensure Era name, duration, and description edits are passed correctly through the TTL.

## Validation Checklist
- [ ] **Visual Grouping:** Eras are clearly delineated with labels and vertical guides.
- [ ] **Accurate Bounds:** The width of an Era on the graph perfectly matches the sum of its subjective durations.
- [ ] **Stability:** Adding a 1-year event in Era 1 moves Era 2 exactly 1 year further to the right.
