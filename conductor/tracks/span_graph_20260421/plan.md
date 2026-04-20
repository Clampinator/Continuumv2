# Implementation Plan: Visual Span Graph Viewport

## Phase 1: Infrastructure & Core Rendering [checkpoint: 4726dbb]
- [x] Task: Create SVG Viewport Infrastructure (ae68b78)
    - [ ] Write Tests: Define basic SVG container and coordinate mapping tests in `tests/span-graph/viewport.test.js`.
    - [ ] Implement: Create `modules/span-graph/viewport.js` to manage the root SVG element and base view state.
- [x] Task: Implement Diagonal Rail Renderer (bebf73c)
    - [ ] Write Tests: Define expectations for mapping character history segments to SVG paths.
    - [ ] Implement: Create `modules/span-graph/renderers/rail-renderer.js` to draw the 1:1 diagonal rail based on the Temporal Projection Service.
- [x] Task: Character Sheet Tab Integration (9f6fd6f)
    - [ ] Write Tests: Verify the tab insertion and data synchronization logic.
    - [ ] Implement: Modify the Character Sheet handler to inject the SVG viewport into the "Lifeline" section.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Infrastructure & Core Rendering' (Protocol in workflow.md)

## Phase 2: Navigation & Interaction [checkpoint: 065cdb7]
- [x] Task: Implement Pan and Zoom System (b64d8d4)
    - [ ] Write Tests: Define wheel-zoom and click-drag pan logic in `tests/span-graph/navigation.test.js`.
    - [ ] Implement: Add interaction handlers to `modules/span-graph/viewport.js`.
- [x] Task: Implement Auto-Center Logic (51289a7)
    - [ ] Write Tests: Define "Snap to Now" expectations for various zoom levels.
    - [ ] Implement: Create `modules/span-graph/actions/auto-center.js`.
- [x] Task: Interactive Tooltips for Nodes (30c7850)
    - [ ] Write Tests: Verify data lookup and position mapping for hover events.
    - [ ] Implement: Create `modules/span-graph/ui/tooltips.js` using standard Foundry VTT tooltip patterns.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Navigation & Interaction' (Protocol in workflow.md)

## Phase 3: Visual Polish & High-Volume Optimization
- [x] Task: Adaptive Grid Background (2e8329e)
    - [ ] Write Tests: Define grid interval expectations for different zoom scales.
    - [ ] Implement: Create `modules/span-graph/renderers/grid-renderer.js` for dynamic SVG grid generation.
- [ ] Task: High-Volume Performance Optimization
    - [ ] Write Tests: Stress-test rendering with 1000+ events.
    - [ ] Implement: Implement LOD (Level of Detail) or SVG grouping optimizations in the render loop.
- [ ] Task: Animated Timeline Transitions
    - [ ] Write Tests: Define timing and easing expectations for view-state shifts.
    - [ ] Implement: Add CSS/JS transitions to coordinate shifts.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Visual Polish & High-Volume Optimization' (Protocol in workflow.md)
