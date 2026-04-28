# Implementation Plan: Historical Event Insertion

## Phase 1: Interaction Refinement
- [ ] **Task: Secure Interaction Coordinates**
    - Verify that `on-pointer-up.js` and `handle-ghost-node.js` are passing the highest-precision (x, y) world coordinates to the dialog.
- [ ] **Task: Harden Dialog Mapping**
    - Ensure `get-template-data.js` for `mode: 'insert'` correctly preserves these coordinates for the submission handler.

## Phase 2: Kernel Synchronization
- [ ] **Task: Atomic Reindexing Pass**
    - Integrate the `resolve-narrative-order.js` kernel into the insertion flow.
    - Ensure it brackets the new node correctly between its physical neighbors.
- [ ] **Task: compensation Sync**
    - Run the `normalize-lifeline-ages.js` service during submission to lock in the new downstream offsets.

## Phase 3: Visual Verification
- [ ] **Task: Visual Fidelity Audit**
    - Insert 3 events in rapid succession at specific pixel points.
    - Verify they do not drift after page refresh.
