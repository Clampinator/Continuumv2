# Specification: Temporal Translation Layer - Task 2: Coordinate Converter

## Objective
Implement `coordinate-converter.js`, the authoritative module for translating Objective Time (Date/Time strings) into pure mathematical coordinates (Milliseconds) and back.

## Philosophical Law: Local Chronology
*   **No UTC:** The system must never append 'Z' to timestamps or use `toISOString()` as a global authority.
*   **No Player Clock:** The player's computer time is irrelevant.
*   **Location Context Authority:** Every string-to-number or number-to-string translation must be aware of the character's physical location.

## Requirements

### 1. Inbound Parsing (Strings to Milliseconds)
*   **Inputs:** `dateString` ("YYYY-MM-DD"), `timeString` ("HH:MM:SS"), and `LocationContext`.
*   **Logic:** Uses the `LocationContext` (e.g., timezone, era-specific rules) to determine the absolute millisecond timestamp.
*   **Outputs:** A finite `Number` (milliseconds since a system epoch, e.g., year 0 or standard Unix epoch, provided consistency is maintained).

### 2. Outbound Formatting (Milliseconds to Strings)
*   **Inputs:** `timestamp` (ms) and `LocationContext`.
*   **Logic:** Calculates the local Date and Time based on the `LocationContext`.
*   **Outputs:** An object `{ date: string, time: string }`.

### 3. LocationContext Schema
A `LocationContext` object must contain at least:
*   `timezone`: A standard IANA timezone string (e.g., `"Europe/London"`, `"America/New_York"`).
*   `offset`: (Optional) A manual millisecond offset if the era predates standard IANA timezones.
