# Specification: Combined Track 1: The Umbilical Cord & Precision Handshake

## Overview
Currently, the system suffers from "conflicting truths" because the database stores physical coordinates (`age`, `ts`) alongside raw Fact strings (`date`, `time`, `location`). This redundancy causes shunting and 12-hour timezone drifts. We will purify the Data Layer to only return raw facts and establish a "Precision Handshake" where the Engine establishes physics and local timezones on the fly.

## Functional Requirements
1. **Purify Data Layer (`getActorHistory.js`)**: Strip all coordinate math. `getActorHistory` must return a flat array of pure facts. Legacy `age` and `ts` properties in the DB will be ignored by the engine.
2. **Active Timezone Law**: Implement a Kernel Reverse History Walk to determine the character's last known location. If no location is found, fallback to the Birth Location's timezone.
3. **Precision Handshake (`handleSubmit.js`)**: UI inputs will be converted into mathematical timestamps using the character's local Active Timezone context, guaranteeing a single, accurate truth is written to the DB.

## Acceptance Criteria
- Zero "Horizontal Leaps" occur when interacting with nodes.
- Localized times accurately reflect geographic context (e.g., London to New York transitions).
- Graph rendering remains pixel-stable after every edit.