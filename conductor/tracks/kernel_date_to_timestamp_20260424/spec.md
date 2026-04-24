# Specification: Kernel Date-to-Timestamp Law

## Overview
This track creates a pure Kernel unit (`parse-objective-timestamp.js`) for converting objective date and time strings into millisecond timestamps. This establishes the "Physical Law" of time-parsing in the Kernel, preparing the system to strip math from the Data Layer.

## Functional Requirements
1.  **Pure Function**: Create `parseObjectiveTimestamp(dateString, timeString, locationContext)` in the Temporal Kernel.
2.  **Default Time**: If the time string is missing or invalid, it must default to '12:00:00'.
3.  **Invalid Handling**: If the date string is missing or invalid, the function must gracefully return `0`.
4.  **Timezone Context**: The parser must calculate the timestamp based on the timezone of the location entered into the event's location field. If no location information is present, it must fall back to the timezone of the most recent preceding location data (ultimately falling back to the birth location's timezone).

## Non-Functional Requirements
-   **Atomization**: The function must reside in its own dedicated Kernel file.
-   **Test Coverage**: The function must have comprehensive unit tests verifying valid dates, missing times, invalid inputs, and timezone calculations based on location context.

## Acceptance Criteria
-   [ ] **Test Verification**: Unit tests confirm the parser correctly calculates millisecond timestamps for standard events and spans, handling default times, invalid inputs, and location-based timezones.
-   [ ] **Code Quality**: The new module is fully documented and adheres to the FPF (Function-Per-File) architectural law.

## Out of Scope
-   Stripping the math from the Data Layer (this is the preparatory step; integration happens in a subsequent track).