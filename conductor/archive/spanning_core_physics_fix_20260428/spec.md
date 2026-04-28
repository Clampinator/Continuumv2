# Specification: Spanning Core Physics Fix

## Objective
Establish a definitive, "hack-free" implementation of the Spanning mechanic. The character's NOW node must correctly persist at the arrival point of a Span without snapping back to the previous rail.

## Requirements

### 1. Dual-Coordinate Authority (NOW Node)
The NOW node represents the character's current state. For a Span to be valid, two mathematical truths must be stored and honored:
*   **`system.personal.objectiveNow`**: The high-precision mathematical timestamp (ms) of the character's current location in objective time.
*   **`system.personal.subjectiveNow`**: The character's current accumulated age (s).

### 2. Historical Continuity (The "Walk")
The Temporal Kernel's sequential walk (`establishHistoryPhysics`) must:
1.  Identify each Span in the narrative sequence.
2.  Update the **World Offset** at the Span's arrival point.
3.  Ensure the subsequent rail segment originates from that arrival point.
4.  If the NOW node occurs after a Span, it MUST inherit the offset of that Span.

### 3. Property Standardization
Enforce the `eventAge` and `eventTime` (or `ts`) naming standard across the entire pipeline:
*   **Database:** `eventAge` (s), `ts` (ms), `arrivalTs` (ms).
*   **Kernel Facts:** `age`, `time`, `arrivalY`.
*   **UI Translator:** `eventAge`, `ts`, `arrivalTs`.

### 4. Zero Override Policy
Identify and remove any code that manually resets `subjectiveNow` based on a "default" calculation that ignores Spans. The mathematical age *after* a Span is no longer a simple delta from the Birth Date; it is a delta from the most recent Span's arrival.
