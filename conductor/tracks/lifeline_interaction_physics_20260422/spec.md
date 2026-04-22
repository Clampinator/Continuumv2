# Specification: Lifeline NOW Node Interaction & Span Physics Rebuild

## Overview
A dedicated track to flawlessly rebuild the NOW node dragging interaction. This will restore the exact physical constraints and visual feedback from the legacy codebase, ensuring that logging continuous time feels completely distinct from logging a time-travel Span.

## Functional Requirements

1.  **Drag Constraints (The Physics)**:
    *   **Level Drag**: When the NOW node is dragged horizontally/diagonally, it must lock to the 1:1 "Level" axis (30 degrees up and to the right).
    *   **Span Drag**: When the NOW node is dragged vertically (up or down), it must lock to the strict Y-axis, representing an instantaneous jump in Objective Date while Subjective Age remains static.

2.  **Dynamic Drag Rendering (The Line)**:
    *   **Level Line**: While dragging on the Level axis, a solid blue line must grow dynamically from the last recorded node directly to the NOW node under the mouse.
    *   **Span Line**: While dragging on the Span axis (up or down), an animated, dotted pink line must connect the last recorded node to the NOW node. The animation must flow in the direction of travel.

3.  **Authoritative Node Shapes & Colors**:
    *   **Level Nodes**: Standard white circles.
    *   **Span Origin (Departure)**: A pink triangle pointing in the direction of the jump (up or down).
    *   **Span Destination (Arrival)**: A pink semi-circle (flat side down for arriving from the future, flat side up for arriving from the past).
    *   **NOW Node**: The distinct yellow/cyan glowing circle.

## Non-Functional Requirements
-   The interaction must be native and fluid. No aggressive `stopPropagation` that breaks browser tracking.
-   The visual feedback (line swapping and node shape preview) must happen *during* the drag, not just after it is dropped.
