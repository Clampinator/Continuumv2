# Implementation Plan: Main Character Sheet Integration

## Objective
Migrate the Lifeline components into the authoritative Character Sheet.

## Implementation Steps

### Phase 1: Tab Integration
- [ ] **Task: Update `character-sheet.html`**
    - Add the "Lifeline" and "History" tabs to the main Handlebars template.
- [ ] **Task: Embed the Graph Viewport**
    - Move the graph container into the new tab.
    - Update `sheet-listeners.js` to initialize the `SpanGraphViewport` when the tab is first rendered.

### Phase 2: Wiring & State
- [ ] **Task: Integrate `getTemporalState` into Sheet Preparation**
    - Ensure the character's temporal state is bundled with the standard actor data.
- [ ] **Task: Handle Multi-Window Synchronization**
    - Ensure that edits made in the graph tab are immediately reflected in the history spreadsheet tab.

### Phase 3: Cleanup
- [ ] **Task: Remove Standalone App Triggers**
    - Deprecate the "Open Standalone Lifeline" buttons once integration is verified.

## Validation Checklist
- [ ] **Tab Stability:** Switching between "Attributes" and "Lifeline" does not reset the graph or cause errors.
- [ ] **Responsive Scaling:** The graph correctly fills the available space in the character sheet window.
- [ ] **Data Sync:** Changing a character's name in the "Bio" section updates the graph labels (if applicable) without a manual refresh.
