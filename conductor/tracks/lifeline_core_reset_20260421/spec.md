# Specification: Lifeline Core Architecture Reset

## Overview
A fundamental rebuild of the Lifeline Span Graph interactions and rendering logic to eliminate fragile patches. The focus is on robust mathematical precision (1:1 Diagonal Authority), reliable native browser event handling for dragging, and persistent, accurate visual information (Gutters and Rails).

## Core Architectural Flaws Addressed

1.  **The "Zombie" Dialog Bug**:
    *   **Flaw**: Dismissing the 'Log Event' dialog throws a `ReferenceError` because the close handler attempts to reference an out-of-scope variable, leaving the dialog permanently open.
    *   **Resolution**: Ensure proper scoping and closure in the dialog lifecycle, avoiding referencing external states that may have been garbage collected or overwritten.

2.  **The "Interaction Shield" Failure (Dead Dragging)**:
    *   **Flaw**: Over-aggressive use of `stopPropagation` and the 'Capture' phase on mouse events effectively blinded the browser's native drag state machine, making nodes unresponsive to touch or drag.
    *   **Resolution**: Rip out the capture-phase hacks. Implement a clean `pointerdown`/`pointermove`/`pointerup` state machine that respects standard DOM event bubbling.

3.  **The "Premature Dialog" Issue**:
    *   **Flaw**: The 'Log Event' dialog triggered instantly on click due to conflicting listeners and a disconnected visual threshold.
    *   **Resolution**: The dialog MUST ONLY open on `pointerup` (or `mouseup`) AND ONLY IF the node was physically dragged past a defined threshold (e.g., 5 pixels). A simple click should select or focus, not create.

4.  **Coordinate Inversion and Scaling (Chronological Chaos)**:
    *   **Flaw**: The graph was drawing down-and-right or piling nodes horizontally. Zooming was cramped.
    *   **Resolution**: Enforce strict 1:1 Diagonal Authority. Birth is bottom-left, NOW is top-right. The timeline must visually sweep upward at a consistent 30-degree angle. Ensure zoom controls allow for viewing the entire lifespan smoothly.

5.  **Missing Visual Information & Styling**:
    *   **Flaw**: Axis labels disappeared when zoomed, and connecting lines were missing or drawn incorrectly. Era creation lacked a dedicated visual target.
    *   **Resolution**:
        *   **Responsive Axis Gutters**: Implement fixed X (Subjective Age) and Y (Objective Date) axes that never disappear. Crucially, these axes must ALWAYS display 5 or 6 data points, evenly justified across the visible range of the window. These points must scale dynamically as the window is resized, panned, or zoomed, exactly matching the reference screenshots.
        *   **Rails**: Enforce solid blue/cyan lines for Leveling segments and animated pink dots for Spans, ensuring they strictly follow the sequential path from Birth to NOW.
        *   **Era Bar**: Implement a solid cyan bar at the bottom labeled "CREATE ERA" as an explicit drag target.
