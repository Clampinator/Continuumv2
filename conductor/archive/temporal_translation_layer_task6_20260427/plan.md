# Implementation Plan: Temporal Translation Layer - Task 6

## Objective
Purge legacy parsers and formatters to achieve architectural purity.

## Key Files & Context
- `modules/span-graph-utils/provide-span-graph-utils.js` (Update)
- `modules/temporal-kernel/establish-history-physics.js` (Verify)
- `modules/temporal-kernel/solve-history-physics.js` (Verify)

## Implementation Steps

### Phase 1: Identify Redundancies
- [x] **Task: Audit `span-graph-utils`** (fdda3ad)

### Phase 2: The Great Purge
- [x] **Task: Refactor legacy utility files to use TTL** (fdda3ad)
- [x] **Task: Update `provide-span-graph-utils.js`** (fdda3ad)

### Phase 3: Kernel Validation
- [x] **Task: Verify Kernel Purity** (fdda3ad)

## Validation Checklist (Definition of Done)
- [ ] **Zero Redundancy:** No two modules perform the same "string-to-integer" or "integer-to-string" logic.
- [ ] **Stable Render:** The graph and spreadsheet still render perfectly (proving that all modules are successfully using the new Translator).
- [ ] **Test Integrity:** All automated tests pass after the deletion of legacy utilities.
