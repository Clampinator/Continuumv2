# Implementation Plan: Temporal Translation Layer - Task 2

## Objective
Implement `modules/temporal-translator/coordinate-converter.js` as the sole authority for translating Date/Time strings into pure mathematical coordinates (ms) based on character location.

## Key Files & Context
- `modules/temporal-translator/coordinate-converter.js` (New File)
- `tests/temporal-translator/coordinate-converter.test.js` (New File)

## Implementation Steps

### Phase 1: Test-Driven Development (TDD)
- [x] **Task: Create test suite for `coordinate-converter.js`** (f579294)

### Phase 2: Module Implementation
- [x] **Task: Implement `coordinate-converter.js`** (f5a9e33)
    1. Create `modules/temporal-translator/coordinate-converter.js`.
    2. Implement `parseObjectiveTime(dateStr, timeStr, context)`:
       - Use `Intl.DateTimeFormat` or a robust parsing strategy to resolve the timezone-specific timestamp.
       - Ensure that "12:00:00" in London and "12:00:00" in NY result in different absolute timestamps.
    3. Implement `formatObjectiveTime(timestamp, context)`:
       - Use `Intl.DateTimeFormat` with the provided `timezone` to extract the local `year`, `month`, `day`, `hour`, `minute`, and `second`.
       - Return a standardized `{ date: "YYYY-MM-DD", time: "HH:MM:SS" }`.

## Validation Checklist (Definition of Done) [checkpoint: 5a9e33b]
- [x] **Unit Tests Pass:** `npm test -- tests/temporal-translator/coordinate-converter.test.js` returns 100% passing tests.
- [x] **Location Sensitivity:** Verified that the same Date/Time string produces different timestamps for different LocationContexts.
- [x] **Reversibility:** Verified that `parse` -> `format` with the same context returns the original strings.
- [x] **No UTC Drift:** Verified that the system does not append "Z" or shift times to UTC during the translation process.
