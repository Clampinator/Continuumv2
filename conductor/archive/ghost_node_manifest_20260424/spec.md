# Specification: Ghost Node Manifest Projection

## Overview
This track refactors the Projector to consume Ghost Node coordinates exclusively from the Authoritative Manifest (`manifest.interaction.ghost`). By eliminating manual renderer calls within the Interaction machine (`PointerMachine`), we enforce the **Dumb Pipe** mandate and ensure the UI is entirely state-driven.

## Functional Requirements
1.  **Manifest Property**: The Render Manifest must expose a dedicated `interaction.ghost` object to define the Ghost Node's screen coordinates (`x`, `y`).
2.  **Omission Strategy**: When the user's cursor leaves a rail, the Engine must completely omit the `ghost` object from the `interaction` block (e.g., `manifest.interaction = {}` or omit the `ghost` key) to instruct the Projector to clear the visual node.
3.  **Projector Consumption**: `handle-rendering.js` must read `manifest.interaction.ghost` and instruct `NodeRenderer` to draw or clear the Ghost Node accordingly.
4.  **Interaction Machine Purity**: All direct calls to `nodeRenderer.renderGhostNode()` must be removed from `PointerMachine.js`.

## Non-Functional Requirements
-   **Strict Trinity Adherence**: The UI render loop must remain a completely "Dumb Pipe", responding only to the injected `manifest`.
-   **Test Coverage**: New unit tests must verify that `manifest-generator.js` correctly projects the ghost snap coordinates into `manifest.interaction.ghost` based on the interaction state.

## Acceptance Criteria
-   [ ] **Visual Fidelity**: Hovering over a rail produces the white dashed node; moving off the rail hides it.
-   [ ] **Code Quality**: `PointerMachine.js` contains zero references to `nodeRenderer`.
-   [ ] **Test Verification**: Unit tests confirm the manifest generation logic for the ghost node.

## Out of Scope
-   Modifying the logic that *calculates* the ghost snap location (only projection is changing).
-   Changing the visual appearance of the ghost node.