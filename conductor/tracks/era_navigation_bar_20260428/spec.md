# Specification: Era Navigation & Drag Bar

## Objective
Implement an interactive macro-navigation bar at the bottom of the graph to facilitate easier exploration of a character's entire timeline.

## 1. Components
*   **Era Blocks:** The bar should be divided into blocks representing each Era, with the width of each block proportional to its subjective duration.
*   **Timeline Scrubber:** A visual marker (e.g., a vertical line or small handle) that shows the current viewport center relative to the entire history.
*   **Viewport Handle:** A draggable "lens" overlay that allows the user to pan the main graph by dragging the lens in the bar.

## 2. Interaction
*   **Jump-to-Era:** Clicking an Era block in the bar immediately pans the main graph to the start of that Era.
*   **Macro-Scaling:** Dragging the edges of the navigation lens adjusts the zoom level of the main graph.
*   **Sync:** The navigation bar must stay in sync with the main viewport's pan and zoom states in real-time.

## 3. Placement
*   Fixed at the bottom of the graph container, occupying a small percentage of the total height.
