# Implementation Plan: Ghost Node Manifest Projection

## Phase 1: Projector Refactoring
- [ ] Task: Update Manifest Generator
    - [ ] Modify `manifest-generator.js` to check the `interaction` object for a `ghostSnap` property.
    - [ ] Create a `manifest.interaction` object to hold interaction state, omitting the `ghost` key entirely if no snap exists.
    - [ ] If a `ghostSnap` exists, project its coordinates into `manifest.interaction.ghost`.
- [ ] Task: Update Rendering Action
    - [ ] Modify `handle-rendering.js` to inspect `manifest.interaction?.ghost`.
    - [ ] Trigger `viewport.nodeRenderer.renderGhostNode` with the provided coordinates, or pass `null` to clear it if the object is omitted.
- [ ] Task: Clean Interaction Machine
    - [ ] Remove all direct calls to `this.viewport.nodeRenderer.renderGhostNode()` from `PointerMachine.js`.
- [ ] Task: Add Projection Tests
    - [ ] Write unit tests to verify `manifest-generator.js` correctly populates or omits `manifest.interaction.ghost` based on the interaction state provided.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Projector Refactoring' (Protocol in workflow.md)