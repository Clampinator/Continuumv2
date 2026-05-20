# Specification: Temporal Translation Layer - Task 4: UI Service Refactor

## Objective
Establish the `temporal-translator.js` facade and refactor UI Services to use the TTL as the sole source of truth for display formatting. This removes all manual math, duration calculation, and string-parsing from the UI layer.

## Requirements

### 1. The Facade (`temporal-translator.js`)
Implement a main entry point for the TTL that provides high-level "ToHuman" and "ToAtomic" functions.

#### `toHuman(rawFacts, history, actor)`
*   **Input:** Raw numeric facts (`eventAge`, `ts`, `arrivalTs`) and historical context.
*   **Logic:**
    1. Calls `LocationResolver` to get the character's `LocationContext`.
    2. Calls `AgeConverter.formatSubjectiveAge` for all age/duration fields.
    3. Calls `CoordinateConverter.formatObjectiveTime` for all timestamp fields.
*   **Output:** A bundle of localized UI strings.

#### `toAtomic(bagOfStrings, history, actor)`
*   **Input:** User-provided strings from the UI.
*   **Logic:**
    1. Resolves `LocationContext`.
    2. Calls `AgeConverter.parseSubjectiveAge` for age inputs.
    3. Calls `CoordinateConverter.parseObjectiveTime` for date/time inputs.
*   **Output:** A bundle of pure mathematical integers.

### 2. UI Service Refactor
Refactor `get-template-data.js` (both Event and Span versions) to:
*   Identify the target timestamp/age.
*   Call `Translator.toHuman`.
*   Pass the resulting strings to the template.
*   **Rule:** Zero occurrences of `Math`, `new Date()`, or `Intl` should remain in these files.
