# Specification: Temporal Translation Layer - Task 1: Age Converter

## Objective
Establish the first component of the Temporal Translation Layer (TTL): the `age-converter.js`. This module will act as the sole authority for converting Subjective Age between human-readable UI strings and atomic integers (seconds).

## Philosophical Law: Dumb Pipe UI & Pure Math Kernel
*   The UI must never perform math on age strings.
*   The State/Kernel must never attempt to parse human shorthand strings.
*   The `age-converter.js` is the absolute boundary between these two domains.

## Requirements

### 1. Parsing (Inbound: UI to Database)
Converts user-typed strings into a Pure Integer (Seconds).
*   **Inputs:** Must accept diverse formats, including:
    *   Compound shorthand: `"25y 10d"`, `"5y 2m 10s"`
    *   Fractions: `"10.5y"`
    *   Raw numbers/seconds: `"15768000s"`, `15768000`
*   **Outputs:** A clean, finite `Number` (seconds).
*   **Invalid Data:** Must return a safe default (`0`) if the string is complete garbage, never `NaN`.

### 2. Formatting (Outbound: Database to UI)
Converts a Pure Integer (Seconds) into the "Gold Standard" UI string.
*   **Inputs:** A finite `Number` (seconds).
*   **Outputs:** A string matching the established standard (e.g., `"25y 10d 05:00:00"`).
*   **Zero/Negative:** Must handle `0` or negative numbers gracefully.
