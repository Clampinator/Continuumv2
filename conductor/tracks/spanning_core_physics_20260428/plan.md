# Implementation Plan: Spanning Core Physics

## Objective
Finalize the Spanning core logic, ensuring absolute persistence and coordinate stability.

## Implementation Steps

### Phase 1: Engine Purity
- [ ] **Task: Enforce Standard Property Names**
    - Audit all core files and ensure `eventAge`, `ts`, and `arrivalTs` are the ONLY names used for coordinate data.
- [ ] **Task: Refactor `establishHistoryPhysics` for Span Authority**
    - Ensure the logic for updating the `currentOffset` is robust and explicitly handles the arrival point of every span in the history array.

### Phase 2: Interaction Logic
- [ ] **Task: Standardize `PointerMachine` Span Calculation**
    - Ensure the "current world" coordinate calculated during a drag is passed correctly through the TTL facade before saving.

### Phase 3: Validation & Persistence
- [ ] **Task: Implement "Post-Save Handshake"**
    - Ensure that after `insertHistoryRow` completes, the character's `subjectiveNow` in the database matches the exactly calculated age from the Span departure.

## Validation Checklist
- [ ] **Zero Snapback:** Spanning up/down and clicking "Save" results in the NOW node staying precisely at the release point.
- [ ] **Rail Integrity:** Subsequent actions after a Span follow the new diagonal path correctly.
- [ ] **Precision Handshake:** The database integers (ms) perfectly match the visual coordinates on the graph.
