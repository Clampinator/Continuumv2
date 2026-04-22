# Implementation Plan: Lifeline HUD Refinement (Ghost Nodes & Experience Boxes)

## Phase 1: Ghost Nodes
- [ ] Task: Implement Mathematical Hover-Insertion
    - [ ] Write Tests: Ensure hover detection correctly identifies the nearest mathematical coordinate on the active rails.
    - [ ] Implement: Refactor `SpanGraphViewport._updateGhostNodeHover` to project a faint "Ghost Node" onto the nearest rail point. Wire clicking this node to `openEventDialog` with the interpolated coordinates.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Ghost Nodes' (Protocol in workflow.md)

## Phase 2: Experience Boxes Engine
- [ ] Task: Develop Experience Data Model & Geometry
    - [ ] Write Tests: Verify the engine correctly identifies Open, Closed, and Re-Opened states for Experiences and calculates their start/end dates/ages correctly.
    - [ ] Implement: Refactor `SegmentGenerator` (or similar) to output an array of structured Experience bounding boxes, including their name, state, and timeline constraints.
- [ ] Task: Implement `CreationRenderer` Updates
    - [ ] Write Tests: Ensure the renderer draws boxes according to state (transparent yellow fade for open, solid yellow for closed).
    - [ ] Implement: Update the `CreationRenderer` to draw these Experience boxes over the timeline. Implement basic label collision avoidance to ensure names remain legible when zoomed out.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Experience Boxes Engine' (Protocol in workflow.md)

## Phase 3: Visual Fade & Polish
- [ ] Task: Implement "The Forgetting" Fade
    - [ ] Write Tests: Verify opacity calculations correctly scale down to 10% over 15 subjective years of distance from the NOW node.
    - [ ] Implement: Enhance the `CreationRenderer` logic to calculate the distance between the Experience's bounding box and the NOW node, dynamically applying the CSS/SVG opacity fade.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Visual Fade & Polish' (Protocol in workflow.md)