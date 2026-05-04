# ISSUES.md - Continuum V2 Known Issues

Tracked bugs, defects, and user-reported problems. When the user reports an
issue, add it here following the format below. Update status when resolved.

---

## Format

Each issue MUST include:
- **ID** - Incremental integer (ISSUE-001, ISSUE-002, ...)
- **Reported** - Date the issue was reported
- **Status** - `[open]` / `[in-progress]` / `[resolved]` / `[wontfix]`
- **Summary** - One-line description
- **Details** - Reproduction steps, expected vs actual behavior, affected files
- **Resolution** - How it was fixed (filled when resolved)

---

## Issues

## ISSUE-004
**Reported:** 2026-05-05 | **Status:** [in-progress]
**Summary:** Spreadsheet CSV import fails (missing submitNewRow) + inline date edits don't recalculate coordinates

**Details:** Two related bugs:
1. `import-spreadsheet-csv.js` imports `submitNewRow` from `submit-spreadsheet-row.js`, but that function never existed. CSV import called a missing function, causing silent failure with "Import complete" reported but no data actually written.
2. `submitSpreadsheetRow` (the inline edit handler) writes raw string values via `actor.update()` without recalculating `ts`/`arrivalTs` epoch coordinates, so date edits don't move the graph position.

**Affected files:** `modules/lifeline/spreadsheet/submit-spreadsheet-row.js`, `modules/lifeline/spreadsheet/import-spreadsheet-csv.js`, `modules/lifeline/spreadsheet/rebuild-from-spreadsheet.js`

**Resolution:** Added `submitNewRow` function to `submit-spreadsheet-row.js` that bridges spreadsheet/CSV form values to the state layer via `insertHistoryRow`. This fixes CSV import. The inline edit coordinate recalculation will be fixed in Step 21/22 of the Trinity refactoring when the spreadsheet edit path is wired through Translator.toAtomic().

## ISSUE-003
**Reported:** 2026-04-29 | **Status:** [resolved]
**Summary:** Recency bonus thresholds wrong - code used <=7yr for +2, spec says 2-5yr

**Details:** `map-years-to-bonus.js` line 9 used `diffYears <= 7` for +2 bonus. The authoritative spec says 2-5 years = +2, 5-10 years = +1, >10 years = 0. Also missing two-axis bonus system (Duration + Distance, cap 3).

**Resolution:** Fixed thresholds in `map-years-to-bonus.js` (<2=+3, <=5=+2, <=10=+1, >10=0). Added `_calculateBonus()` in `generate-experiences.js` implementing two-axis Duration+Distance with cap of 3. Fixed `calculate-resonance-bonuses.js` to read `data.age` with fallback to `data.eventAge`.

## ISSUE-002
**Reported:** 2026-04-29 | **Status:** [resolved]
**Summary:** generate-experiences outputs wrong field names (startX/endX vs startAge/endAge)

**Details:** Output object used `startX/endX/startY/endY` but the spec and span-graph renderer expect `startAge/endAge/startTime/endTime`. Missing `isClosed` and `bonus` fields. Legacy painter `draw-experience-blocks.js` already uses the new names but `generate-experiences.js` was outputting the old ones, causing both pipelines to break.

**Resolution:** Changed `generate-experiences.js` output to use `startAge/endAge/startTime/endTime/isClosed/bonus`. Added dual-format node accessors (`_age`/`_time`) to support both `.age/.time` (new engine) and `.x/.y` (legacy) node formats.

## ISSUE-001
**Reported:** 2026-04-29 | **Status:** [resolved]
**Summary:** Span-graph experience pipeline broken - manifest never projects experiences

**Details:** `manifest-generator.js` initialized `experiences: []` but never populated it from `state.experiences`. The `experience-renderer.js` rendered nothing because the manifest was always empty. Experience code was written against the legacy lifeline pipeline (`draw-experience-blocks.js` via `span-graph-data-processor.js`), not the span-graph pipeline (`manifest-generator.js` -> `experience-renderer.js`).

**Resolution:** Added experience projection step to `manifest-generator.js` that transforms `state.experiences` world coordinates to screen coordinates via `viewport.worldToScreen()`. The span-graph pipeline now flows correctly: `getTemporalState()` -> `finalizeState()` -> `generateExperiences()` -> manifest projection -> `experience-renderer.js`.