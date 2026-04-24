# Implementation Plan: Ghost Node Manifest Projection

## Phase 1: Projector Refactoring [checkpoint: cd043e2]
- [x] Task: Update Manifest Generator (1e2cd02)
    - [x] Modify `manifest-generator.js` to check the `interaction` object for a `ghostSnap` property.
    - [x] Create a `manifest.interaction` object to hold interaction state, omitting the `ghost` key entirely if no snap exists.
    - [x] If a `ghostSnap` exists, project its coordinates into `manifest.interaction.ghost`.
- [x] Task: Update Rendering Action (40b3306)
    - [x] Modify `handle-rendering.js` to inspect `manifest.interaction?.ghost`.
    - [x] Trigger `viewport.nodeRenderer.renderGhostNode` with the provided coordinates, or pass `null` to clear it if the object is omitted.
- [x] Task: Clean Interaction Machine (01abbec)
    - [x] Remove all direct calls to `this.viewport.nodeRenderer.renderGhostNode()` from `PointerMachine.js`.
- [x] Task: Add Projection Tests (464b7e6)
    - [x] Write unit tests to verify `manifest-generator.js` correctly populates or omits `manifest.interaction.ghost` based on the interaction state provided.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Projector Refactoring' (Protocol in workflow.md)