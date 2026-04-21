# Specification: Lifeline Spreadsheet Integration

## Goal
To implement a high-performance, spreadsheet-like interface for managing a character's non-linear lifeline. This interface will allow for precise, inline data entry and will integrate deeply with the Temporal Engine to automatically reconcile the timeline.

## Functional Requirements
1.  **Application Container**:
    - The spreadsheet will be accessed via the existing button in the title bar of the "Lifeline" section of the character sheet.
    - It will open as a standalone, resizable Foundry VTT application window.
2.  **Data Grid & Inline Editing**:
    - Display the lifeline data (Eras, Experiences, Events) in a tabular format.
    - Enable "Excel-like" inline editing: clicking a cell (e.g., Age, Date, Description) turns it into an input field.
    - Edits must instantly update the underlying actor data and trigger the Temporal Engine.
3.  **Sorting & Organization**:
    - **Auto-Chronological**: The spreadsheet strictly enforces chronological order based on the Temporal Engine's calculated output.
    - **Hierarchical Grouping**: Rows are visually grouped by Eras, then Experiences, then Events.
4.  **Bulk Actions & Tooling**:
    - **CSV Export**: Allow users to export the entire lifeline data to a standard CSV format.
    - **CSV Import**: Allow users to import lifeline data from a CSV, validating it against the Temporal Engine.
    - **Bulk Time Shift**: A utility to select multiple events and apply a relative time shift (e.g., "+5 years objective time").

## Non-Functional Requirements
- **Performance**: Must handle lifelines with 500+ events without noticeable lag during inline editing or sorting.
- **Data Integrity**: All edits must pass through the Temporal Engine's validation rules before being committed to the database.

## Out of Scope
- Visual rendering of the graph (handled by the Span Graph Viewport).
- Editing character attributes or skills outside of the lifeline context.
