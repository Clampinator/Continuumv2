# Specification: Deep Decimation

## Overview
A high-precision architectural refactor to end the "house of cards" fragility. We will systematically decimate the monolithic temporal engine and rendering logic into isolated, single-responsibility services. 

## The Three Pillars of Isolation

### 1. The Temporal Kernel (Physics)
A dedicated directory (`modules/temporal-kernel/`) containing pure, side-effect-free math functions.
*   **`diagonal-solver.js`**: Pure Age-to-Timestamp conversion.
*   **`sort-sequencer.js`**: Pure logic for finding narrative neighbors and sort-brackets.
*   **`span-validator.js`**: Pure enforcement of "Level Breath" and Rank limits.
*   **RULE**: Once a kernel function is verified, it is LOCKED and immutable.

### 2. The Projection Engine (The Brain)
A translation layer that takes raw character records and uses the Kernel to output a **Render Manifest**.
*   **The Manifest**: A plain JSON object containing calculated coordinates (x, y), colors, and shapes.
*   **Goal**: Resolve the "node leaping" bug here, in isolation from drawing and database code.

### 3. Dumb Renderers (The Pipes)
Renderers (`RailRenderer`, `NodeRenderer`, etc.) are refactored to be "Dumb."
*   They receive the Manifest and perform pure SVG/DOM operations.
*   **Constraint**: Renderers are FORBIDDEN from performing any math or record-lookups.

## Functional Requirements
1.  **Zero-Side-Effect Math**: Physics logic must be completely decoupled from data processing.
2.  **Manifest-Driven Visuals**: The graph must render entirely from a pre-calculated projection object.
3.  **Atomic Interaction Handlers**: Decompose `onPointerMove` into focused sub-handlers (e.g., `PanHandler`, `NodeDragHandler`).

## Success Criteria
*   Fixing a math bug in the Kernel has zero risk of making rendering lines vanish.
*   Updating a Renderer's style has zero risk of "leaping" a node to the wrong date.
