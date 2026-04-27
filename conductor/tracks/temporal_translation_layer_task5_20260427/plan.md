# Implementation Plan: Temporal Translation Layer - Task 5

## Objective
Refactor the "Inbound" data path (UI -> DB) to use the TTL facade, ensuring mathematical integrity.

## Key Files & Context
- `modules/state/insert-history-row.js` (Refactor)
- `modules/state/update-history-row.js` (Refactor)
- `modules/temporal-kernel/establish-history-physics.js` (Update imports)
- `modules/temporal-kernel/parse-objective-timestamp.js` (Delete)

## Implementation Steps

### Phase 1: Refactor State Layer
- [x] **Task: Refactor `insert-history-row.js`** (f6a40a7)
- [x] **Task: Refactor `update-history-row.js`** (f6a40a7)

### Phase 2: Purge Legacy Kernel Parser
- [x] **Task: Update `establish-history-physics.js`** (f6a40a7)
- [x] **Task: Remove `parse-objective-timestamp.js`** (f6a40a7)

### Phase 3: Final Integration Verification
- [ ] **Task: End-to-End Handshake Audit**
    1. Verify that saving a new event with shorthand (e.g. "10y") results in the correct integer in the DB.
    2. Verify that localized dates in London 1888 save correctly as non-UTC timestamps.

## Validation Checklist (Definition of Done)
- [ ] **Data Integrity:** Saving a complex span with specific times resulting in zero mathematical drift between the UI display and the stored integer.
- [ ] **Zero Legacy Parsers:** `grep` for `parseObjectiveTimestamp` outside the Translator returns zero results.
- [ ] **Unit Tests:** `npm test` across state and kernel layers passes with the new refactored logic.
