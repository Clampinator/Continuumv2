# Specification: Eras Structural Refinement

## Objective
Solidify the "Era" layer as the primary chronological and structural grouping of a character's life.

## 1. Structural Rules
*   **Sequential Authority:** Eras are ordered sequentially by Subjective Age.
*   **Duration Rule:** The total duration of an Era is the sum of the durations of all its constituent events and experiences.
*   **Propagation Law:** Any change in the duration of an earlier Era (e.g., adding an event or a span) must correctly shift the start subjective age of all subsequent Eras.

## 2. Rendering (The Macro View)
*   **Overarching Labels:** Render Era names as large, prominent labels at the top of the graph, visually grouping the experiences beneath them.
*   **Separators:** Use distinct vertical lines or background shading to indicate where one Era ends and the next begins.
*   **Dynamic Scaling:** Eras should handle a wide range of durations (from days to decades) without overlapping labels.

## 3. Interaction
*   **Era Selection:** Clicking an Era label should center the viewport on that segment of the timeline.
*   **Macro Edits:** Eventually support macro-level dragging of Era boundaries (if applicable).
