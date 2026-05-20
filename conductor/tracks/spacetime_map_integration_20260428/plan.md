# Implementation Plan: Space-Time Map Integration

## Objective
Wire the Lifeline events to the interactive geospatial map.

## Implementation Steps

### Phase 1: Event/State Hooking
- [ ] **Task: Implement Map-Sync Hook**
    - Add a listener to the `PointerMachine` that broadcasts a `LOCATION_SELECTED` event when a node is clicked.
- [ ] **Task: Update Map Manager to handle Chronological Events**
    - Ensure the existing map component can receive and process focus requests from the Lifeline.

### Phase 2: UI Integration
- [ ] **Task: Add "View on Map" Button to Dialogs**
    - Provide a direct link in the Event/Span editors to jump the map to the stored coordinates.
- [ ] **Task: Implement "Grab Map Coordinates"**
    - A button in the editor that pulls the map's current center/zoom into the form fields.

### Phase 3: Bidirectional Persistence
- [ ] **Task: Update Map Marker Drags to Sync to State**
    - Ensure that when a marker is moved on the map, the corresponding event's location facts are updated via `updateHistoryRow`.

## Validation Checklist
- [ ] **Smooth Panning:** Clicking a node in London 1888 centers the map on the correct coordinates instantly.
- [ ] **Data Round-trip:** Grabbing coordinates from the map, saving the event, and reopening it shows the exact same latitude and longitude.
- [ ] **Conflict Resolution:** Moving a map marker correctly updates the "Location" text if a reverse-geocoding service is available (optional).
