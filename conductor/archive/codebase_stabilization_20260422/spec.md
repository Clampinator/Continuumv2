# Specification: Codebase Stabilization & Architectural Integrity

## Overview
A critical intervention track dedicated solely to auditing the recent Lifeline Refinements, identifying brittle "patches" or "hacks," and refactoring them into robust, deterministic core systems. The primary goal is to ensure the `SpanGraphViewport` interaction machine (dragging, inserting, rendering) is completely unshakeable and physically absolute before any new features are added.

## Target Objectives

1.  **Interaction Machine Detox**:
    *   Audit the `SpanGraphViewport` pointer handlers (`_onPointerDown`, `_onPointerMove`, `_onPointerUp`).
    *   Eliminate any "conditional patches" or isolated DOM manipulations (like the top-layer `interactionGroup` if it proved brittle) that separate the visual drag state from the mathematical `getTemporalState` authority.
    *   The NOW node must drag with 100% fluidity, bounded only by strict physical laws.

2.  **Absolute Render Loop Authority**:
    *   Verify that `_render()` is fully stateless and deterministic.
    *   The render sequence must be strictly data-driven: `Experiences` -> `Rails` -> `Nodes`. No element should conditionally skip rendering or rely on external DOM caching.

3.  **Data Schema Consistency**:
    *   Audit the data processor (`flattenEvents`) and insertion handlers (`handleSubmit.js`).
    *   Ensure the adoption of high-precision `ts` and `age` coordinates is applied consistently. Eliminate any legacy fallbacks that might secretly trigger and override exact coordinates.

4.  **Zero-Tolerance Regression Baseline**:
    *   Establish a locked, high-fidelity codebase where the three core functions—NOW node dragging (Level/Span), Historical Node Rendering, and Experience Box Geometry—function flawlessly and simultaneously under stress.