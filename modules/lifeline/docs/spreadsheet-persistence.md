# Lifeline Spreadsheet - Data Persistence

How the spreadsheet reads, writes, and survives re-renders without losing user data.

---

## Data Source

All spreadsheet rows are read from `actor.system.ages` (Foundry actor document data).
`getSpreadsheetRows` (`spreadsheet/get-spreadsheet-rows.js`) flattens the nested
`ages -> experiences -> events` tree into a flat row array each time `getData()` is called.

The actor document is the single source of truth. Nothing lives only in the DOM.

---

## Write Paths

There are three paths that commit data to the actor. All of them call `actor.update()`,
which persists to Foundry's database and fires the `updateActor` hook.

### 1. Simple Field Edit - `submitSimpleFieldEdit`
File: `spreadsheet/submit-spreadsheet-row.js`

Used for title, notes, location - fields that do not require coordinate recalculation.
Builds a dot-path update object and calls `actor.update()` directly.

```
actor.update({
    "system.ages.<ageId>.experiences.<expId>.events.<eventId>.title": value,
    ...
})
```

Triggered by: blur on `.lss-field-title`, `.lss-field-notes`, `.lss-field-location`.

### 2. New Row - `submitNewRow`
File: `spreadsheet/submit-spreadsheet-row.js`

Creates a brand-new event on the timeline. Delegates to `handleSubmit` with mode `'insert'`
or `'log'` depending on position relative to the current NOW cursor:
- `'log'` when the actor has no existing events, OR when the new event's timestamp is at or
  after the current NOW cursor. This updates the NOW cursor to the new event's position.
- `'insert'` when the actor already has events AND the new event falls before the current
  NOW cursor. This inserts the event into history without moving NOW.

IMPORTANT: `'insert'` mode caps events to the NOW cursor position via `reindexLifelineNodes`.
If the timeline is effectively empty (only ages defined, no events), the NOW cursor is at
age=0 (birth), so using `'insert'` mode would silently place all events at age=0. This is
why the mode check tests for actual events, not just the presence of ages.

The insertion point (ageRaw) is computed by `_getSpreadsheetInsertionPoint`, which walks the
`graphData.levelNodes` segments to find the age corresponding to the event's timestamp. For
events that fall after all existing nodes, the age is extrapolated from the last rail segment:
`age = (ts - railOffset) / 1000` where `railOffset = lastNode.time - lastNode.age * 1000`.

Triggered by: clicking `.lss-add-btn` or pressing Enter in the new-row form.

### 3. Expanded Edit - `submitExpandedEdit`
File: `spreadsheet/submit-spreadsheet-row.js`

Edits an existing event. Delegates to `handleSubmit` with mode `'edit'`. Same pipeline
as new row but overwrites the existing event at its known path instead of creating a new ID.
After saving, calls `_updateExperienceDates` to recalculate the parent Experience's
`dateFrom` / `dateTo` bounds.

Triggered by: clicking `.lss-save-row-btn`, or blur on `.lss-field-date` / `.lss-field-time`.

---

## Location Coordinates

Location data is stored in two separate fields per event:

- Non-span events: `location` (display name), `lat`, `lng`, `zoom`
- Span events: `spanFromLocation`, `spanFromLat`, `spanFromLng`, `spanFromZoom`
  (and matching `spanTo*` fields for the arrival end)

### How coordinates get saved on blur

When the user blurs a `.lss-field-location` input (`bind-spreadsheet-listeners.js` line 224):

1. The location name is saved immediately via `submitSimpleFieldEdit`.
2. `geocodeAddress` is called against the Nominatim service (or a Location actor lookup).
3. If coordinates are found, a second `submitSimpleFieldEdit` saves `lat`, `lng`, `zoom`.

The two-step write means the name is never lost even if geocoding fails.

### Map pin button

The map pin button (`.lss-row-map-pin-btn`) uses `geocodeAddress` directly - not
`panToLocation` - to avoid triggering actor updates mid-flight that would cause a re-render
while the async call is still running. It then does a single `submitSimpleFieldEdit`
with both the formatted address and the coordinates.

### Location resolution priority (`_geocodeLocation`)

1. Look up a Location-type actor by name (exact, case-insensitive).
2. If no match, fall back to Nominatim geocoding via `geocodeAddress`.

---

## Re-render Cycle

`LifelineSpreadsheetApp` (`spreadsheet/lifeline-spreadsheet-app.js`) registers an
`updateActor` hook on first render. When the hook fires for this actor, it calls
`this.render(false)`, which re-runs `getData()` from the actor document and rebuilds
the DOM.

### Re-render suppression during typing

`_onActorUpdate` checks whether an `INPUT` or `TEXTAREA` inside the spreadsheet
currently has focus. If so, it skips the re-render. This prevents the DOM from being
replaced while the user is mid-edit. The next `actor.update()` triggered by that
field's blur handler will fire another `updateActor`, which will re-render cleanly
after the user is done.

---

## State That Survives Re-render

Because re-renders replace the DOM, any state stored only in the DOM is lost.
The following state is preserved in the `LifelineSpreadsheetApp` instance instead:

- `app._expandedRows` - a `Set` of `eventId` strings for currently expanded rows.
  `getData()` stamps `r.isExpanded = true` on rows whose ID is in this set, so the
  template re-opens them after the DOM rebuild.
- `app.sortNewestFirst` - boolean toggled by the sort button; read by `getData()`.

---

## Data Path Reference

```
actor.system.ages
  [ageId]
    events
      [eventId]
        title, notes, date, time, location, lat, lng, zoom
        isSpan, isRest, sort, createdAt, age
        spanFromDate, spanFromTime, spanFromLocation, spanFromLat, spanFromLng, spanFromZoom
        spanToDate, spanToTime, spanToLocation, spanToLat, spanToLng, spanToZoom
    experiences
      [expId]
        name, dateFrom, dateTo, isOngoing, color, sort
        events
          [eventId]  (same fields as above)
```

---

## Key Files

| File | Role |
|------|------|
| `spreadsheet/lifeline-spreadsheet-app.js` | App class, re-render hook, expanded-rows state |
| `spreadsheet/open-lifeline-spreadsheet.js` | One-instance-per-actor manager |
| `spreadsheet/get-spreadsheet-rows.js` | Reads actor data into flat row array |
| `spreadsheet/gather-row-data.js` | Reads form inputs into plain value objects |
| `spreadsheet/submit-spreadsheet-row.js` | All three write paths + location geocoding |
| `spreadsheet/bind-spreadsheet-listeners.js` | Event bindings - blur saves, pin button, delete |
| `services/ui/event-dialog/handle-submit.js` | Core event write logic (shared with lifeline graph) |
