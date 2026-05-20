# Specification: Kernel Fuzzy Collision Law

## Goal
Extract the node-merging logic (the rule that decides if a triangle or semicircle should represent overlapping events) from the Engine into a dedicated Kernel unit.

## Context
The "Singular Identity" rule enforces that two nodes cannot occupy the same physical spacetime coordinates without merging. Previously, this logic was inlined in the `getTemporalState` engine.

## Requirements
- Move collision logic to `modules/temporal-kernel/apply-collision-laws.js`.
- Ensure Span destinations (semicircles) "swallow" regular level events (circles) when they occupy the same physical coordinate.
- Ensure Span destinations (semicircles) "swallow" span origins (triangles) when they occupy the same physical coordinate.
- Maintain tolerance for physical overlap (100ms for time, 0.1 for age).

## Verification
- Unit tests for `applyCollisionLaws` covering all merge scenarios.
- Regression testing for `getTemporalState`.
