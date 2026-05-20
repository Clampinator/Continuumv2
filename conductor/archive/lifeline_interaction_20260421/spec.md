# Specification: Lifeline Interaction & Creation Toolkit

## Overview
To make the visual graph interactive for creation, enabling users to log events, spans, eras, and update their age directly from the graphical interface. This track also includes necessary test suite repairs to ensure the underlying math remains stable.

## Functional Requirements

1.  **NOW Node Interactions**:
    *   **Create Event:** Dropping the NOW node onto an empty space on the rail should open the 'Log Event' dialog to create a new entry at that projected date/age.
    *   **Update Age:** Dropping the NOW node on an existing event should update the character's subjective age to match that event's age.
    *   **Create Span:** Dragging the NOW node vertically should initiate a 'Span' (time-travel jump) creation flow.
2.  **Creation Bars**:
    *   **Create Era:** Dragging horizontally along the bottom axis creates a new Era encompassing that time span.
3.  **Ghost Nodes**:
    *   **Hover Reveal:** Ghost nodes should appear when hovering between two existing events on the rail.
    *   **Click to Insert:** Clicking a Ghost node should open the 'Log Event' dialog pre-filled with the interpolated age/date for precise insertion.
4.  **Visual Feedback**:
    *   **Dynamic Tooltips:** Show a tooltip with the projected Date and Age dynamically updating while dragging the NOW node.

## Test Suite Repair
1.  **Fix SVG Prepend Errors:** Resolve `this.viewport.svg.prepend is not a function` errors occurring in the test suite.
2.  **Fix Projection Mismatches:** Resolve the `1000 to be 1100` projection mismatch in `projection.test.js`.
