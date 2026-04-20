# Specification: Visual Span Graph Viewport

## Goal
To implement a high-performance, interactive SVG-based viewport that renders the character's non-linear lifeline. This viewport will be embedded directly into the character sheet, replacing the existing redundant graph in the "Lifeline" section.

## Functional Requirements
1.  **SVG Rendering Engine**: 
    - Create a modular renderer that maps the `Temporal Projection Service` output to SVG coordinate space.
    - Render "Eras" and "Experience" blocks as styled rectangles.
    - Render "Events" as interactive nodes on the "Diagonal Rail".
2.  **Navigation System**:
    - **Smooth Zoom**: Mouse-wheel based scaling that preserves focus on the cursor.
    - **Infinite Pan**: Click-and-drag movement to explore the character's history.
    - **Reset/Auto-Center**: Double-click to snap the view back to the current Subjective Age ("Now").
3.  **Visual Infrastructure**:
    - **Adaptive Grid**: A dynamic background grid that shifts its scale (e.g., from years to days) based on zoom level.
    - **Interactive Tooltips**: Detailed data overlays when hovering over events or experience blocks.
    - **Animated Transitions**: Smooth visual feedback when the timeline shifts or jumps occur.
4.  **Foundry VTT Integration**:
    - **Inline Embed**: Replace the current redundant graph in the character sheet's "Lifeline" section.
    - **Real-time Sync**: Automatically update the rendering when the actor's history or state changes.

## Non-Functional Requirements
- **Scalability**: Must be optimized for high-volume lifelines (potentially exceeding 500 events) using efficient SVG grouping and level-of-detail (LOD) rendering if necessary.
- **Performance**: Maintain smooth interactions (targeting 60fps) during navigation.
- **Maintainability**: Styles must be isolated in `span_graph.css` and use standard CSS variables.

## Out of Scope
- Spreadsheet-style editing within the graph (handled by the Lifeline Spreadsheet).
- Standalone app window for the graph (this version is focused on character sheet integration).
