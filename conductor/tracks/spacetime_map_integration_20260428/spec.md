# Specification: Space-Time Map Integration

## Objective
Establish a seamless bidirectional link between the character's Lifeline (Chronology) and the interactive Space-Time Map (Geography).

## 1. Outbound: Lifeline to Map
*   **Event Selection:** Clicking an event on the graph or spreadsheet should trigger the map to pan and zoom to that event's stored `lat`, `lng`, and `zoom`.
*   **Era Context:** The map should ideally reflect the visual style or "marker set" of the era associated with the selected event.

## 2. Inbound: Map to Lifeline
*   **Geospatial Logging:** Dropping a pin on the map or clicking a location should populate the `eventLocation`, `lat`, and `lng` fields in the "Log Event" or "Log Span" dialogs.
*   **Real-time Handshake:** Moving a marker on the map should update the corresponding event record in the database, triggering a re-render of the Lifeline.

## 3. Data Schema
*   Ensure all events and spans support: `eventLocation` (string), `lat` (number), `lng` (number), `zoom` (number).
