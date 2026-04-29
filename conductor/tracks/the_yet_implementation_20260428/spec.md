# Specification: The "Yet" (Future Events)

## Objective
Establish a system for tracking and rendering events that are scheduled for the character's future but have not yet been lived.

## 1. Concepts
*   **Unfulfilled Events:** These are nodes that exist beyond the character's current **NOW** node in the narrative timeline.
*   **Fulfillment Logic:** When the character's **NOW** node moves to or past the age of a "Yet" event, it transitions from a ghost node into a permanent historical event.

## 2. Rendering
*   **Ghost Nodes:** "Yet" events are rendered with distinct visual styling (e.g., lower opacity, greyed-out colors, or outlined shapes).
*   **Dashed Rails:** The path segments connecting the **NOW** node to future "Yet" nodes are rendered with dashed lines, indicating their tentative status.
*   **Age Calculation:** Future events do not contribute to the character's "Subjective Age" (in terms of spent experience) until they are fulfilled.

## 3. Interaction
*   **Scheduling:** Users can add nodes to "The Yet" via a dedicated dialog or by dragging the "Now" handle and choosing to schedule an event instead of logging one.
*   **Modification:** "Yet" events can be rescheduled or deleted more easily than historical events.
