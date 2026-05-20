# Specification: Main Character Sheet Integration

## Objective
Embed the Lifeline Graph and Spreadsheet tools directly into the primary Continuum Character Sheet, replacing the standalone experimental windows.

## 1. UI Architecture
*   **Tabbed Interface:** Integrate the Lifeline Graph into a dedicated "Lifeline" tab and the Spreadsheet into a "History" tab within the character sheet.
*   **Persistent Viewport:** The graph viewport should maintain its zoom and pan levels even when the user switches tabs, provided the sheet remains open.

## 2. Data Flow
*   **Authoritative Preparation:** Update the sheet's `getData()` or `prepareData()` cycle to call the `Temporal Engine` and `TTL`.
*   **Real-time Updates:** When character stats or history facts are updated, the graph and spreadsheet sub-components must re-render automatically.

## 3. Layout
*   Ensure the graph scales responsively to the width of the character sheet window.
*   Optimize the sidebar or macro-controls to fit within the sheet's layout constraints.
