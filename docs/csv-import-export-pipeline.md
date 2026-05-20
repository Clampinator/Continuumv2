# CSV Import/Export Pipeline - Technical Reference

## Overview

The CSV import/export system serializes a character's lifeline to CSV and back.
The export writes events with a `subjectiveAge` column (seconds from birth) that
serves as the canonical round-trip position. The import must reconstruct events
with correct `eventAge` values so the span-graph renders them on the right rails.

---

## Data Formats

| Field | Units | Type | Notes |
|-------|-------|------|-------|
| `eventAge` | seconds | number | Subjective age from birth (stored in DB) |
| `subjectiveAge` (CSV) | seconds | raw number | Same value as eventAge, for round-trips |
| `ts` | milliseconds | number | Objective departure timestamp |
| `arrivalTs` | milliseconds | number | Objective arrival timestamp (same as ts for level events) |
| `date` (CSV) | YYYY-MM-DD | string | ISO date format |
| `time` (CSV) | HH:MM:SS | string | 24-hour time |
| `sort` | integer | number | Narrative order (incremented by 1000) |

### The Diagonal Authority (Physical Constant)
```
1 second of Subjective Age = 1000 milliseconds of Objective Time
Age = (Time - Offset) / 1000
Offset = ArrivalTime - Age * 1000
```

---

## Export Pipeline

### Entry: `modules/lifeline/spreadsheet/export-spreadsheet-csv.js`

1. Calls `getSpreadsheetRows(actor)` to get rows + era metadata
2. For each row, writes 19 CSV columns:
   ```
   event(date blank), date, time, eventTitle, eventNotes, location,
   eventIsSpan, eventSpanFromDate, eventSpanFromTime, eventSpanFromLocation,
   eventSpanToDate, eventSpanToTime, eventSpanToLocation,
   experience, startExperience, endExperience,
   eraName, isbirth(blank), subjectiveAge
   ```

3. **subjectiveAge on export**: read from `row.age` (a number in seconds from
   `node.x` in the temporal engine). Written as a raw number. If invalid, writes
   empty string.

### Data source: `modules/lifeline/spreadsheet/get-spreadsheet-rows.js`

1. Flattens events via `flattenEvents(rawEras, actor)`
2. Runs temporal engine: `getTemporalState(history, subjectiveNow, originTime, actor)`
3. Maps engine nodes to spreadsheet rows via `Translator.toHuman()`
4. `row.age` comes from `node.x` (subjective age in seconds from `establishHistoryPhysics`)
5. Rows sorted by `_ageSeconds` ascending

---

## Import Pipeline

### Entry: `modules/lifeline/spreadsheet/import-spreadsheet-csv.js`

1. Reads file, strips BOM, parses CSV
2. `_orientFromBirth()`: finds `isbirth` row, reorders so birth is first
3. Validates `eventTitle` column exists
4. WIPE: deletes all existing eras
5. Creates a default "Imported Events" era
6. For each row: calls `submitNewRow(app.sheet, fv, { batchImport: true })`
7. Syncs NOW after all rows imported

### `_rowToFormValues()` - CSV row to form values

```js
// subjectiveAge handling:
const rawSubjectiveAge = parseFloat(get('subjectiveAge'));
const subjectiveAge = Number.isFinite(rawSubjectiveAge) && rawSubjectiveAge > 0
    ? rawSubjectiveAge : null;
```

- If CSV has `subjectiveAge` and it's a valid positive number, it's preserved
- If absent/invalid, set to null (compensation wave will compute from timestamps)

### CRITICAL: `fv.eventAge` assignment before submitNewRow

The import sets `fv.eventAge = fv.subjectiveAge || 0` before calling `submitNewRow`.

When `subjectiveAge` is present:
- `fv.eventAge` = the canonical seconds-from-birth value
- `submitNewRow` -> `insertHistoryRow` -> `Translator.toAtomic` calls
  `parseSubjectiveAge(persistable.eventAge)` which returns the same number
- The compensation wave preserves this value (it skips the newly inserted node)

When `subjectiveAge` is absent:
- `fv.eventAge = 0`
- `Translator.toAtomic` returns `eventAge: 0`
- The compensation wave walks history and computes `projectSubjectiveAge(ts, offset)`
  for every node. Since the new node has age 0 but a timestamp far from birth,
  the difference is > 0.1s, so the wave computes the correct age from timestamps
- BUT: `insertHistoryRow` line 123-124 SKIPS the newly inserted node
  (`if (id === newId) continue`). So the new node keeps age 0.
- HOWEVER: `submitNewRow` also independently computes `eventAge` from DOB+date
  and passes it in the data object. `Translator.toAtomic` parses it to seconds.
  This value IS used for the DB write because it's part of `atomic`.
  The compensation wave's shift for the new node is explicitly discarded.

### The submitNewRow flow

`modules/lifeline/spreadsheet/submit-spreadsheet-row.js`:

1. Determines `eventIsSpan` from `fv.eventIsSpan`
2. Transfers level fields to span-from fields if span-from is empty
3. Resolves era via `resolveEventEra(eras, 0)` (age 0, kernel will recalculate)
4. Handles experience creation/closing
5. Computes `eventAge`:
   ```js
   const depTs = parseObjectiveTime(depDate, depTime, birthCtx);
   eventAge = Math.max(0, Math.round((depTs - birthTs) / 1000));
   ```
6. Calls `insertHistoryRow(actor, data, { isLog: false })`

### The insertHistoryRow flow

`modules/state/insert-history-row.js`:

1. Generates new ID
2. Gets existing history via `getActorHistory(actor)`
3. Resolves origin time from DOB
4. **TTL Handshake**: `const atomic = Translator.toAtomic(data, history, actor)`
   - `parseSubjectiveAge(data.eventAge)` -> age in seconds
   - `resolveLocationContext(history, age, actor)` -> timezone-aware context
   - `parseObjectiveTime(dateStr, timeStr, context)` -> `ts` in ms
   - For spans: `parseObjectiveTime(spanTo, spanToTime, context)` -> `arrivalTs` in ms
5. Builds target node: `{ x: atomic.eventAge, y: atomic.ts, arrivalY: atomic.arrivalTs }`
6. Validates span physics (skips Level Breath)
7. Resolves narrative sort order
8. **Compensation wave**: `solveHistoryPhysics(virtualHistory, originTime)`
9. DB commit: writes new record + sort shifts + age shifts
10. **Explicitly skips the new node** in compensation wave: `if (id === newId) continue`

---

## The Compensation Wave - `solve-history-physics.js`

```js
export function solveHistoryPhysics(history, originTime) -> { id -> newAge }
```

1. Filters out NOW and Virtual nodes
2. Sorts by `sort` ascending
3. Sets `objectiveOffset = originTime` (birth timestamp in ms)
4. Walks through sorted nodes:
   - If `isBirth`: sets `objectiveOffset = node.y` (birth timestamp)
   - Otherwise:
     - `calculatedAge = projectSubjectiveAge(fromTs, objectiveOffset)`
     - `= Math.max(0, (fromTs - objectiveOffset) / 1000)`
     - If `|calculatedAge - savedAge| > 0.1`: marks shift
     - If span: `objectiveOffset = computeOffsetFromArrival(arrivalTs, ageAtJump)`
       `= arrivalTs - ageAtJump * 1000`

### What gets shifted
- Pre-existing nodes whose stored `eventAge` drifts from the recomputed value

### What does NOT get shifted
- The newly inserted node (explicitly skipped by `insertHistoryRow`)
- NOW nodes (excluded from the walk)
- Virtual nodes (excluded from the walk)

### After a span
- The world clock offset shifts so subsequent level events have correct ages
- This is why the compensation wave is needed: inserting a span mid-timeline
  changes the offset for all downstream events

---

## Why Batch Write Bypass Fails

The batch-write approach (pre-computing all ages via projectSubjectiveAge
and writing in one actor.update()) seems correct in theory but fails because:

1. **Location context**: `parseObjectiveTime` is timezone-aware via
   `resolveLocationContext`. Characters who change locations during their
   lifetime have different timezone offsets at different ages. The batch
   approach resolves context once at age 0 (birth), producing wrong
   timestamps for events at other locations.

2. **Translator.toAtomic is location-aware**: It calls
   `resolveLocationContext(history, age, actor)` with the ACTUAL age and
   full history, which provides correct timezone context for each event.
   The batch approach uses a fixed birth-context for all events.

3. **The compensation wave is the correct mechanism**: It walks through
   events in narrative order, computing ages relative to the current
   world clock offset (which shifts after spans), and corrects drift for
   existing nodes. Skipping it means ages won't be corrected for
   timezone-dependent timestamp differences.

---

## CSV Template Headers

```js
export const TEMPLATE_HEADERS = [
    'date', 'time', 'eventTitle', 'eventNotes', 'location',
    'eventIsSpan', 'eventIsRest',
    'eventSpanFromDate', 'eventSpanFromTime', 'eventSpanFromLocation',
    'eventSpanToDate', 'eventSpanToTime', 'eventSpanToLocation',
    'experience', 'startExperience', 'endExperience',
    'subjectiveAge',
];
```

---

## Known Bugs

1. `import-spreadsheet-csv.js` line 236: `fv.eventToTime` should be `fv.eventSpanToTime`
   (typo in property name). This only affects the display string in the record,
   not the graph position.

2. `submitNewRow` computes `eventAge` from `(depTs - birthTs) / 1000` when
   `subjectiveAge` is absent. This is a naive calculation that doesn't account for
   spans before the event. The compensation wave corrects this for existing nodes,
   but the newly inserted node's age comes from this naive computation. For level
   events with no prior spans, this produces correct results. For level events
   after a span, the compensation wave would compute a different age but is
   explicitly skipped for the new node. The `fv.subjectiveAge || 0` from CSV
   should be used instead (it accounts for prior spans because it was computed
   by the temporal engine on export).

---

## Rules for Future Refactors

1. **Never bypass submitNewRow/insertHistoryRow for CSV import.** The
   compensation wave is needed to keep existing nodes' ages correct as new
   events are inserted between them.

2. **Never compute eventAge from DOB+date alone.** Use `fv.subjectiveAge || 0`
   so that `Translator.toAtomic` can resolve location context correctly.

3. **The compensation wave skips the newly inserted node.** This is by design -
   the user's click position is authoritative for new events. But for CSV import,
   `fv.subjectiveAge` (from the exporter) IS the authoritative position.

4. **`parseObjectiveTime` is location-aware.** Never call it with a fixed
   context for all events. `Translator.toAtomic` resolves context per-event.

5. **The `subjectiveAge` CSV column is the round-trip guarantee.** When the
   exporter writes it, it came from `node.x` in the temporal engine (the
   physically-correct subjective age). When the importer reads it, it should
   be used as `fv.eventAge` so `Translator.toAtomic` gets the right starting
   value for context resolution.

6. **yield between insertions.** `await new Promise(r => setTimeout(r, 50))`
   lets Foundry process each actor.update before the next event is inserted,
   preventing race conditions in the Foundry data pipeline.