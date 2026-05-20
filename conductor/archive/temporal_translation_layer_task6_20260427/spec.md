# Specification: Temporal Translation Layer - Task 6: The Great Purge

## Objective
Finalize the isolation of the Temporal Kernel by removing all legacy string parsing and manual formatting. This task purges redundant utility functions and ensures the entire application speaks the same high-precision atomic language.

## Requirements

### 1. Final Kernel Purification
Refactor any remaining logic in `establish-history-physics.js` and `solve-history-physics.js` to:
*   Use `CoordinateConverter` for all timestamp parsing (as a last resort fallback).
*   Assume the "Fact" layer provided by `getActorHistory` is the sole source of numerical truth.

### 2. Obsolete Utility Purge
Identify and remove utility functions from `modules/span-graph-utils/` that have been replaced by the TTL.
*   **Candidates for deletion:** `parse-age-string.js`, `format-subjective-age.js`, `convert-timestamp-to-date-string.js`, `format-duration.js` (logic moved to TTL).
*   **Final Action:** Update `provide-span-graph-utils.js` to remove these exports.

### 3. Global Schema Enforcement
Verify that the character database (`actor.system.eras`) no longer relies on strings for any core mathematical operations.
