# Implementation Plan: Lifeline Spreadsheet Integration

## Phase 1: Application Infrastructure & UI Shell [checkpoint: 245f76e]
- [x] Task: Create Standalone Application Window (e69275d)
    - [x] Write Tests: Define window initialization and sheet button binding in `tests/lifeline-spreadsheet/app-window.test.js`.
    - [x] Implement: Create `modules/lifeline/spreadsheet/app-window.js` to manage the standalone Foundry VTT Application.
    - [x] Implement: Wire the existing "Lifeline" title bar button in the character sheet to launch this app.
- [x] Task: Build HTML/CSS Grid Layout (9a152fe)
    - [x] Write Tests: Define expectations for rendering the hierarchical structure (Eras -> Experiences -> Events).
    - [x] Implement: Create `templates/apps/lifeline-spreadsheet.hbs` and corresponding CSS for a dense, Excel-like data grid.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Application Infrastructure & UI Shell' (Protocol in workflow.md)

## Phase 2: Data Binding & Inline Editing
- [x] Task: Implement Data Synchronization (3c3b08c)
    - [x] Write Tests: Verify that actor data correctly populates the grid in strict chronological order.
    - [x] Implement: Create data prep logic to feed `getTemporalState` output into the Handlebars template.
- [x] Task: Implement Inline Edit Handlers (60f1831)
    - [x] Write Tests: Test that cell edits correctly update actor data and trigger re-calculations.
    - [x] Implement: Add change listeners to grid inputs (Age, Date, Description) to process updates via the Temporal Engine.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Data Binding & Inline Editing' (Protocol in workflow.md)

## Phase 3: Bulk Actions & Tooling
- [x] Task: Implement CSV Export and Import (0b9caf1)
    - [x] Write Tests: Verify data serialization to CSV and deserialization/validation from CSV.
    - [x] Implement: Create `modules/lifeline/spreadsheet/csv-tools.js` with export/import handlers.
- [~] Task: Implement Bulk Time Shift
    - [ ] Write Tests: Test applying a relative time delta to a subset of events.
    - [ ] Implement: Add multi-select UI to the grid and a utility to shift objective time for selected rows.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Bulk Actions & Tooling' (Protocol in workflow.md)

## Phase: Review Fixes
- [x] Task: Apply review suggestions (50e8d4c)
