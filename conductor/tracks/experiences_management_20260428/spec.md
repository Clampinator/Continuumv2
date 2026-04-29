# Specification: Experiences Management & Rendering

## Objective
Implement a robust "Experience" system where Experiences act as logical and visual containers for events. The start and end of an Experience are anchored to specific Events (nodes) in the character's lifeline.

## 1. Data Model
*   **Storage:** Experiences are stored within Eras in `actor.system.eras[eraId].experiences`.
*   **Properties:**
    *   `id`: Random unique ID.
    *   `name`: String.
    *   `description`: String.
    *   `dateFrom`: Human-readable date string (authoritative start).
    *   `dateTo`: Human-readable date string (authoritative end).
    *   `isOngoing`: Boolean (if true, overrides `dateTo` and ends at NOW).

## 2. Logic & Calculations (The Engine)
*   **Subjective Bounds (Expansion Logic):** The `startX` and `endX` must be resolved by finding the absolute earliest and latest events associated with the experience ID. 
    *   **Elasticity:** If an experience is re-opened at a later age, the bounding box expands to meet the new event, covering the intervening gap.
*   **Objective Bounds:** The `startY` and `endY` (Timestamp in ms).
*   **Recency Bonus:** 
    *   Calculated relative to the current `objectiveNow` timestamp.
    *   **Ends < 2 years ago:** +3 Bonus.
    *   **Ends 2-5 years ago:** +2 Bonus.
    *   **Ends > 5 years ago:** +1 Bonus.
*   **The Forgetting (Visual Aging):**
    *   Opacity starts at 100% for ongoing or very recent experiences.
    *   Decreases to a minimum of **10%** for experiences that ended in the distant past (threshold: 15 years).

## 3. Rendering (Visual Engine)
*   **SVG Rectangles:** Encompass the full X (age) and Y (time) range of the experience.
*   **Gradients:** 
    *   **Open Experiences:** Horizontal gradient from solid to transparent, fading towards the right (the present).
    *   **Closed Experiences:** Solid fill with recency-based opacity.
*   **Labels:** Rendered within the bounding box, respecting the "Forgetting" opacity.

## 4. UI & Interaction (Event Dialog)
*   **Categorized Selection:** The Event/Span dialog must provide two distinct scrollable areas for Experience management:
    1.  **Close Active:** List of all currently open/ongoing experiences. Selecting one sets the current event as the end point.
    2.  **Re-open Past:** List of all previously closed experiences. Selecting one removes the closure fact and expands the experience to the current event.
*   **Scrollable List:** The UI must handle a large number of experiences using a dedicated scrollable container.
*   **Dumb Pipe:** The UI simply passes the target Experience ID and the intended action (Open/Close/Re-open) to the Translator.
