# Specification: Lifeline Span Logic & Dialog Implementation

## Overview
A dedicated track to rebuild the \"Span Result\" dialog from scratch. This dialog is specifically triggered when a user drags the NOW node vertically (a Time-Travel jump). It must integrate perfectly with the new V13, pointer-event-driven architecture while providing all the complex chronological data required by the Continuum system.

## Functional Requirements

1.  **Interaction Trigger (The Bridge)**:
    *   The `SpanGraphViewport` must differentiate between a Level drag and a Span drag upon release.
    *   If `mode === 'span'`, the system MUST open the new `openSpanDialog` instead of the standard event dialog.

2.  **Span-Specific Data Model**:
    *   The dialog must handle data unique to a Span:
        *   **Arrival Date (Objective)**: The exact mathematical date the user dropped the node on the Y-axis.
        *   **Departure Date**: The date the jump originated from (cached from the interaction state).
        *   **Span Distance/Cost**: The system must automatically calculate the total time displaced.
        *   **Down-Time (Subjective)**: User input for how much subjective time elapsed *during* the jump.
        *   **Span Rank/Frag**: User inputs for the mechanics of the jump.
        *   **24-Hour Rest Toggle**: A checkbox or toggle for applying rest logic.
        *   **SpaceTime Map Hooks**: Full integration with the map engine for setting spatial coordinates.

3.  **V13 Application Architecture**:
    *   The dialog must be built from scratch using clean, modern Foundry patterns (avoiding legacy jQuery listeners that caused the previous \"Zombie\" bugs).
    *   It must gracefully handle cancellations, reverting the NOW node to its pre-drag state without triggering a full, expensive re-render loop.

## Non-Functional Requirements
-   **Mathematical Precision**: The calculated Arrival Date must exactly match the Y-coordinate where the user released the mouse, strictly adhering to the `TARGET_RATIO` and `SECONDS_IN_YEAR_STRICT` constants.
-   **Visual Consistency**: The Handlebars template for the dialog should match the aesthetic of the new high-fidelity visual graph (futuristic yet archival).
