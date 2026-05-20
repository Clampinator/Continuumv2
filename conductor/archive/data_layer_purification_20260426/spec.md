# Specification: Data Layer Purification (Fact-Only Architecture)

## Overview
Currently, the system stores physical coordinates (`age`, `ts`) in the database, causing conflicts with the raw Facts (`Date`, `Time`, `Location`). This leads to "shunting" and 12-hour timezone drifts. We will purify the Data Layer by stripping all coordinate math from `get-actor-history.js` and ensuring the database is a pure reporter of Facts. All physics and coordinate calculations will be handled exclusively by the Kernel.

## Functional Requirements
1. **Purify Data Layer**: 
    - Refactor `modules/state/get-actor-history.js` to remove all `Date.getTime()` and physical coordinate math (`x`, `y`, `arrivalY`). It must return a flat array of pure facts.
    - Legacy `age` and `ts` properties in the database records will be ignored by the fetch layer.
2. **Precision Handshake (UI to Kernel to DB)**: 
    - When the UI submits data (date, time, location edits), it must pass the raw data to the Kernel.
    - The Kernel will handle any necessary processing or translation required to ensure the data is suitable for database storage as pure facts.
    - The State update/insert modules must not perform any coordinate math or inline physics.
3. **Engine Physics Authority (DB to Kernel to UI)**:
    - The Temporal Engine will establish the physical coordinates (`x`, `y`, `arrivalY`) strictly on-the-fly from the raw fact strings provided by the database, using dedicated Kernel units.
    - The UI Projector and renderers will remain "dumb," drawing only what the Kernel/Engine dictates based on the newly calculated coordinates.

## Acceptance Criteria
- `get-actor-history.js` returns only raw facts and contains no coordinate math.
- User can successfully alter the date, time, or location of an existing node in the UI.
- The edits are successfully passed through the Kernel and stored in the database as pure facts.
- The UI accurately redraws the node's position based on the new data without any "Horizontal Leaps" or shunting.
- Zero calculations are performed in the UI or the database.