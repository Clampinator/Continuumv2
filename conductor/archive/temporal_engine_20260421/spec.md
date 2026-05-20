# Specification: Core Temporal Projection and Robust Insertion Engine

## Goal
To implement a foundational, isolated math engine that governs the "Diagonal Authority" (1:1 Age-to-Time mapping) and provides robust, non-destructive insertion logic for both Level Events and Spans.

## Key Principles
- **Segment-Based Projection**: Instead of one procedural pass, the lifeline is treated as a hierarchy of "Segments" or "Epochs." Each segment starts with an initial Subjective Age and Objective Time (Offset), making chronological shifts easy to propagate.
- **Atomic Command Pattern**: Every temporal operation (e.g., `InsertEvent`, `InsertSpan`, `MoveEvent`) is a discrete, testable command that produces a predictable delta.
- **Stable Bracketing**: Using Subjective Age as the primary key for all sorting and neighbor identification to ensure historical stability.
- **Downward Propagation**: Spans automatically update the `objectiveOffset` for all subsequent segments in the hierarchy.
- **Snap-to-Rail Logic**: A unified projection service that can "fix" manual date overrides by projecting them back onto the valid diagonal rail.

## Core Features
1. **Temporal Context Provider**: A centralized service that calculates the full spacetime state of an actor.
2. **Segment Hierarchy**: Data structure that stores the "Origin" of each diagonal rail segment.
3. **Span Pool Ledger**: A real-time consumption tracker for "Span Cost."
4. **Insertion Service**: Specialized logic for:
    - **Level Events**: Non-destructive, sort-stable insertion between existing nodes.
    - **Spans**: Recursive downward propagation of chronology shifts.
    - **Diagonal Preservation**: Automatic Age/Time reconciliation for retrospective edits.

## Technical Architecture
- **Language**: Vanilla JavaScript (ES Modules).
- **Module**: `modules/temporal-engine/`.
- **Data Model**: `system.eras.experiences.events` (flattened for internal processing).
- **Validation**: Mathematical self-verification of the 1:1 constant across all segments.
