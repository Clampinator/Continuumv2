# Implementation Plan: Temporal Translation Layer - Task 4

## Objective
Establish the TTL facade and refactor UI Services to achieve "Dumb Pipe" status.

## Key Files & Context
- `modules/temporal-translator/temporal-translator.js` (New Facade)
- `modules/lifeline/services/ui/event-dialog/get-template-data.js` (Refactor)
- `modules/lifeline/services/ui/span-dialog/get-template-data.js` (Refactor)

## Implementation Steps

### Phase 1: Create TTL Facade
- [x] **Task: Implement `temporal-translator.js`** (f600494)
    1. Create the file.
    2. Import `AgeConverter`, `CoordinateConverter`, and `LocationResolver`.
    3. Implement `toHuman` to bundle all display strings.
    4. Implement `toAtomic` to bundle all database integers.

### Phase 2: Refactor Event UI
- [x] **Task: Refactor Event `getTemplateData`** (f6743ee)

### Phase 3: Refactor Span UI
- [x] **Task: Refactor Span `getTemplateData`** (f6743ee)

## Validation Checklist (Definition of Done)
- [ ] **Functional UI:** Opening an Event or Span dialog shows correct, localized dates and durations.
- [ ] **Zero UI Math:** `grep` for `Math`, `new Date`, `*`, `/` in refactored UI files returns zero logic-based results.
- [ ] **Test Integrity:** Existing tests for these services pass (or are updated to reflect the new API).
- [ ] **Consistency:** Changing a location in the history immediately updates the timezone-aware display in the next dialog open.
