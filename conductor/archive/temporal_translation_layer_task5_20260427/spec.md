# Specification: Temporal Translation Layer - Task 5: State/Submit Refactor

## Objective
Refactor the system's "Inbound" data path to use the `temporal-translator.js` facade. This ensures that every piece of data coming from the UI is converted into high-precision atomic integers (seconds and ms) before being stored in the database.

## Philosophical Law: The Precision Handshake
*   **The Air Gap:** No UI string should ever touch a database field that is intended for mathematical calculation.
*   **The Translator Authority:** The `Translator.toAtomic` function is the only authorized way to convert UI strings into numbers during a database commit.

## Requirements

### 1. Refactor `insertHistoryRow.js` and `updateHistoryRow.js`
*   Import `Translator`.
*   Replace manual `parseObjectiveTimestamp` and `Number(data.eventAge)` calls with a single call to `Translator.toAtomic(data, history, actor)`.
*   Use the resulting integers for all kernel physics and narrative re-sequencing.

### 2. Standardize Database Fields
Ensure the database consistently stores:
*   `eventAge`: Integer (Seconds)
*   `ts`: Integer (Milliseconds)
*   `arrivalTs`: Integer (Milliseconds)

### 3. Purge Legacy Parsing
*   Remove `modules/temporal-kernel/parse-objective-timestamp.js`.
*   Update all callers (e.g., `establish-history-physics.js`) to use `Translator` or `CoordinateConverter` directly.
*   Remove all references to `parseDate` and `normalizeDateInput` from the State and Kernel layers.
