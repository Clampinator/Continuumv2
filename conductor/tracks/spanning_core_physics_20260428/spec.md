# Specification: Spanning Core Physics

## Objective
Establish a definitive, "hack-free" implementation of the Spanning mechanic. The character's NOW node must correctly persist at the arrival point of a Span without snapping back to the previous rail.

## 1. Mathematical Standards
*   **Property Consistency:** Use `eventAge` (s), `ts` (ms), and `arrivalTs` (ms) as the absolute naming standard across the pipeline.
*   **Offset Propagation:** The `Temporal Engine` must calculate a `World Offset` that shifts based on the magnitude of the Span.
*   **The Baseline:** A Span arrival point establishes a new 1:1 diagonal rail for all subsequent subjective progression.

## 2. Interaction
*   **Vertical Lock:** During a Span drag, the interaction machine must lock the cursor's movement to a vertical line (changing Objective Time while keeping Subjective Age constant).
*   **Live Preview:** The visual graph must render a dotted pink line showing the jump magnitude in real-time.

## 3. Data Integrity
*   **Atomic Sync:** Upon saving a Span, the database must atomically update `objectiveNow` and `subjectiveNow` to ensure the next render cycle correctly identifies the character's new position in time.
