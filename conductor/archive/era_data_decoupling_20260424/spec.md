# Specification: Era Data Decoupling

## Overview
This track updates the Temporal Engine to gather Era names, colors, and durations, passing them to the Projector as pure state within the `getTemporalState` payload. By removing all direct `actor` object access from `manifest-generator.js`, we strictly enforce Authoritative Data Isolation (ADI).

## Functional Requirements
1.  **State Data Structure**: The Temporal Engine must inject an `eras` array into the returned state object. Each element should be a pre-calculated object: `{ name, startAge, duration, color }`.
2.  **Engine Extraction**: `get-temporal-state.js` will read `actor.system.eras`. The engine will assume they are provided in their correct narrative sort order by the database when calculating the `startAge` of each subsequent era.
3.  **Projector Consumption**: `manifest-generator.js` will be updated to read `state.eras` exclusively, eliminating any reference to `viewport.actor.system.eras`.
4.  **Defensive Rendering**: The Manifest Generator must employ Graceful Skips (if `state.eras` is missing/empty, draw no bands without throwing errors) and Safe Fallbacks (if an individual era lacks a duration or color, it defaults safely).

## Non-Functional Requirements
-   **Strict Trinity Adherence**: The UI render loop must remain a completely "Dumb Pipe", responding only to the injected `manifest`.
-   **Atomization**: Maintain the single-purpose focus of the engine and generator.

## Acceptance Criteria
-   [ ] **Visual Fidelity**: Reloading the character sheet correctly renders the background Era bands (name, color, width) across the span graph.
-   [ ] **Code Quality**: `manifest-generator.js` contains zero references to the `actor` object or its internal structures.
-   [ ] **Test Verification**: Unit tests confirm the Temporal Engine correctly maps the actor era data into the pre-calculated `state.eras` array.

## Out of Scope
-   Modifying how eras are created or edited in the character sheet UI.
-   Adding new visual features to the Era bands (e.g., gradients or complex labels).