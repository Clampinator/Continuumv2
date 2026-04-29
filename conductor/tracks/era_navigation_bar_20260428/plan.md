# Implementation Plan: Era Navigation & Drag Bar

## Objective
Implement the Era Navigation Bar component.

## Implementation Steps

### Phase 1: Layout & Rendering
- [ ] **Task: Create `EraBarRenderer.js`**
    - Implement the SVG drawing logic for the macro-blocks and the navigation handle.
    - Ensure it renders at the bottom of the graph.
- [ ] **Task: Integrate with `manifest-generator.js`**
    - Pass the full character history bounds (total age) to the manifest to ensure the bar scales correctly.

### Phase 2: Interaction Machine
- [ ] **Task: Implement Era Bar Click-to-Pan**
    - Update `activate-listeners.js` to handle interactions with the navigation bar.
- [ ] **Task: Implement Scrubber/Lens Dragging**
    - Allow users to drag the navigation lens to smoothly pan the graph.

### Phase 3: Synchronization
- [ ] **Task: Implement Bidirectional Sync**
    - When the user zooms/pans in the main graph, the navigation bar handle must update its size and position.
    - When the navigation bar handle is dragged, the main graph's viewState must update.

## Validation Checklist
- [ ] **Visual Proportionality:** If Era 1 is 10 years and Era 2 is 5 years, the Era 1 block in the bar is exactly twice as wide as the Era 2 block.
- [ ] **Seamless Navigation:** Dragging the bar handle results in smooth, lag-free panning of the main graph.
- [ ] **Scaling Accuracy:** Adjusting the bar lens width correctly changes the `viewState.zoom`.
