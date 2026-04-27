# Implementation Plan: Temporal Translation Layer - Task 1

## Objective
Implement `modules/temporal-translator/age-converter.js` as the exclusive module for translating Subjective Age between atomic integers (seconds) and UI-friendly strings. 

## Key Files & Context
- `modules/temporal-translator/age-converter.js` (New File)
- `tests/temporal-translator/age-converter.test.js` (New File)

## Implementation Steps

### Phase 1: Test-Driven Development (TDD)
- [x] **Task: Create test suite for `age-converter.js`** (462a50a)
    1. Create `tests/temporal-translator/age-converter.test.js`.
    2. Write tests for parsing inbound strings:
       - `"1y"` -> `31536000`
       - `"1y 1d"` -> `31622400`
       - `"10.5y"` -> `331128000` (Approx based on 365 days/year)
       - `"15768000s"` -> `15768000`
       - `"abc"` -> `0`
    3. Write tests for formatting outbound integers to "Gold Standard" UI strings.
    4. Write tests for edge cases: `0`, negative numbers, extremely large numbers.

### Phase 2: Module Implementation
- [x] **Task: Implement `age-converter.js`** (462a50a)
    1. Create `modules/temporal-translator/age-converter.js`.
    2. Implement `parseSubjectiveAge(input)`: 
       - Use regex to extract numeric values associated with units (y, d, h, m, s).
       - Convert units to seconds (365d/y, 24h/d, 60m/h, 60s/m).
       - Sum the components and return the integer.
       - Handle raw numbers/numeric strings.
    3. Implement `formatSubjectiveAge(seconds)`:
       - Perform integer division and remainder math to extract years, days, hours, minutes, and seconds.
       - Construct the standard string (e.g., `"25y 10d 05:00:00"`).

## Validation Checklist (Definition of Done)
- [ ] **Unit Tests Pass:** `npm test -- tests/temporal-translator/age-converter.test.js` returns 100% passing tests and >80% coverage.
- [ ] **Parsing Accuracy:** Verified that `"1y"` parses to `31536000` seconds exactly.
- [ ] **Formatting Accuracy:** Verified that `31622400` seconds formats back to `"1y 1d 00:00:00"` (or equivalent standard).
- [ ] **Resilience:** Garbage strings like `"abc"` or `NaN` parse to `0` safely.
- [ ] **No Context Leak:** The module contains no references to `actor`, `document`, or global state.
