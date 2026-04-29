# Implementation Plan: Historical Span Insertion

## Objective
Implement the logic and UI interactions for inserting spans into historical narrative sections.

## Implementation Steps

### Phase 1: Temporal Kernel Hardening
- [ ] **Task: Implement Propagation Logic in `Temporal Kernel`**
    - Create a utility to calculate the displacement of a proposed span.
    - Implement the "Compensation Wave": a function that iterates through subsequent history facts and updates their atomic `ts` values.
- [ ] **Task: Update `insert-history-row.js` for Historical Context**
    - Ensure that when an event is inserted, the re-sequencing logic correctly handles the shift in objective time baselines for downstream events.

### Phase 2: Interaction Machine
- [ ] **Task: Implement Historical Span Drag**
    - Update the `PointerMachine` to handle a two-step insertion:
        1. Choose Age (Snap to Rail).
        2. Choose Magnitude (Vertical Drag).
- [ ] **Task: Live Propagation Preview**
    - Update `manifest-generator.js` to visually shift downstream nodes in real-time during an insertion drag.

### Phase 3: UI & Validation
- [ ] **Task: Refactor "Insert Span" Dialog**
    - Ensure the dialog clearly shows the "Before" and "After" objective times for the character's subsequent history.

## Validation Checklist
- [ ] **Physical Integrity:** After inserting a 1-hour span in the past, every subsequent event in the spreadsheet and graph is exactly 1 hour later in objective time.
- [ ] **Narrative Continuity:** The character's subjective age remains unchanged for all events; only their objective coordinates shift.
- [ ] **Zero Drift:** Repeated insertions and deletions result in a timeline that returns perfectly to its original state.
