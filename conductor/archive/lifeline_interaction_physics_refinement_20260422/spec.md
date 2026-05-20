# Specification: Lifeline Interaction & Span Physics Refinement

## Overview
A dedicated track to implement high-precision node interactions—including free insertion along any level rail and direct context-editing of existing nodes. Crucially, this track will implement the core physics validators of the Continuum universe: enforcing a required "Level Breath" between Spans and tracking/enforcing the finite "Span Pool".

## Functional Requirements

1.  **High-Precision Free Insertion**:
    *   The `SpanGraphViewport` must support mathematical insertion of new nodes at *any* arbitrary point along a blue (Level) rail, not just at predefined midpoints or ends.
    *   Clicking an active Level rail or interacting with a Ghost Node on that rail must accurately capture the interpolated Age and Time coordinates for the insertion dialog.

2.  **Direct Node Editing (Context Action)**:
    *   Users must be able to Right-Click (or similarly trigger a context action on) any existing historical node (Event or Span).
    *   This action must open the `event-dialog` or `span-dialog` populated with that node's existing data, in 'Edit' mode.

3.  **Span Physics: "The Level Breath"**:
    *   The system must explicitly enforce the rule that characters cannot perform two consecutive Spans without any level time between them.
    *   **Validation**: When creating a Span, the system must verify that the Departure point has a Subjective Age > 0 seconds since the arrival of the previous Span.
    *   If violated, the system must block the action and display a clear, lore-accurate UI warning.

4.  **Span Physics: "The Span Pool"**:
    *   **Capacity**: The system calculates a finite displacement pool (e.g., 1 year = 31,536,000 objective seconds) based on the character's Span Rank.
    *   **Consumption**: Every Span jump records its objective displacement (`Math.abs(arrivalTime - departureTime)`), which is subtracted from the pool.
    *   **Restoration**: "24h Rest" events in the character's history authoritative reset the consumed pool to 0 at that point in the subjective timeline.
    *   **Validation**: The system must block any new Span creation that would result in the consumed pool exceeding the maximum capacity since the last Rest event.

## Non-Functional Requirements
-   **No Hacks**: The physics validation and insertion logic must be implemented as robust, decoupled services (e.g., within `TemporalEngine`), not patched into the UI rendering loops.
-   **Negative Objective Time**: The system must explicitly permit and correctly calculate Spans that arrive at an Objective Time before the character's Date of Birth (Age 0).
-   **Recursive Re-indexing**: Any insertion or edit that alters the timeline must trigger a core service to correctly propagate subsequent Subjective Age updates downward through the linked history.