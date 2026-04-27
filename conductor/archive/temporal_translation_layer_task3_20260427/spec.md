# Specification: Temporal Translation Layer - Task 3: Location Resolver

## Objective
Implement `location-resolver.js`, the module responsible for establishing the character's physical and chronological context at any point in their timeline. This context is required by the `Coordinate Converter` to perform accurate, localized time translations.

## Philosophical Law: Historical Authority
*   **The Reverse Walk:** To determine the context of an event, the system must walk backward through the character's narrative history until it finds a physical location marker.
*   **Location-to-Timezone Mapping:** Every named location must resolve to a valid IANA timezone (or a manual offset).

## Requirements

### 1. Active Context Resolution
*   **Inputs:** `history` (Full actor history facts), `targetAge` (Subjective Age in seconds).
*   **Logic:**
    1. Filter history for events where `age <= targetAge`.
    2. Sort descending by `age` and `sort` (Reverse Narrative Order).
    3. Find the first record with a non-empty `eventLocation` (or `spanToLocation`/`spanFromLocation`).
    4. Map the discovered location name to a `LocationContext`.
*   **Fallback:** If no location is found, fall back to the "Birth Location" (defined in `actor.system.personal.birthLocation`) or a default (e.g., `"Europe/London"` or `"UTC"` if unknown).

### 2. Timezone Mapping
*   **Internal Map:** Maintain a robust internal mapping of common location names to IANA timezones.
*   **Schema:** Return `{ location: string, timezone: string, offset: number|null }`.

## Interface
```javascript
export function resolveLocationContext(history, targetAge, actor = null) { ... }
```
