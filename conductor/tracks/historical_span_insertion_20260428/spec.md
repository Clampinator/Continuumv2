# Specification: Historical Span Insertion

## Objective
Implement the logic required to insert a Span event into the character's past narrative and correctly propagate the physical consequences (time shifts) to all subsequent events.

## 1. The Physics of Insertion
*   **The Discontinuity:** When a Span is inserted at Age X, it creates a vertical jump in Objective Time.
*   **Downstream Shift:** Every event occurring after Age X must have its Objective Time (Y coordinate) shifted by the magnitude of the Span's displacement.
*   **Narrative Re-sequencing:** If the Span's arrival time creates a conflict or a new narrative branch, the system must re-index the `sort` values of subsequent events to maintain chronological authority.

## 2. Calculation
*   **Displacement = Arrival Time - Departure Time.**
*   **Propagation Law:** `New_Time = Old_Time + Displacement` for all events where `sort > span.sort`.

## 3. Interaction
*   **Ghost Snapping:** Users can drag the "insertion ghost" along an existing rail to choose the departure age.
*   **Vertical Drag:** After choosing the age, the user drags vertically to define the span's magnitude.
*   **Downstream Preview:** During the drag, the visual engine should ideally preview the shift of the subsequent timeline.
