# TRACKS.md - Project Track Register

All track specs, plans, and status consolidated here. Source files in `conductor/tracks/`.

---

## Active Tracks

### [~] Experiences Management & Rendering
**ID:** `experiences_management_20260428` | **Type:** feature

Experiences are logical/visual containers for events, anchored to start/end nodes. Includes recency bonus calculation, "The Forgetting" opacity fade (100% -> 10% over 15 years), elastic bounding boxes for re-opened experiences, and categorized dialog UIs (Close Active / Re-open Past).

**Spec:**
- Data model: stored in `actor.system.eras[eraId].experiences` with `id`, `name`, `description`, `dateFrom`, `dateTo`, `isOngoing`
- Recency bonus: <2yr = +3, 2-5yr = +2, 5-10yr = +1, >10yr = 0 (distance axis); duration axis: <6mo=0, 6mo-2yr=+1, 2-4yr=+2, 4+yr=+3; combined cap of +3
- The Forgetting: opacity degrades to 10% minimum for experiences ended >15 years ago
- Open experiences use horizontal gradient (solid -> transparent toward NOW)
- Closed experiences use solid fill with recency-based opacity

**Plan:**
- Phase 1: Engine & Logic [CORRECTED] - Fixed output field names (startAge/endAge/startTime/endTime), added isClosed/bonus fields, fixed recency bonus thresholds (2-5yr=+2, 5-10yr=+1), implemented two-axis bonus, added description field, null-guarded node accessors
- Phase 2: Projection & Rendering [FIXED] - Added experience projection step to manifest-generator.js (was dead code), enabled click interaction on experience-renderer.js (data-id/data-era-id attributes, pointer-events on labels)
- Phase 3: UI & Interaction [PARTIAL] - Wired description field; remaining: wire bonuses to dice roller end-to-end

---

### [ ] Eras Structural Refinement
**ID:** `eras_structural_refinement_20260428` | **Type:** feature

Solidify Eras as the primary chronological grouping. Enforce sequential authority by subjective age, duration rules (sum of constituent events), and downward propagation (changes to earlier eras shift subsequent era start ages).

**Spec:**
- Eras ordered sequentially by Subjective Age
- Duration = sum of constituent event/experience durations
- Propagation: edits to earlier eras shift startAge of all later eras
- Rendering: overarching labels at graph top, vertical separators, background shading
- Click era label to center viewport on that segment

**Plan:**
- Phase 1: Engine Logic - Era duration calc, downward propagation enforcement
- Phase 2: Projection & Rendering - Era metadata in manifest, EraRenderer with labels/striping
- Phase 3: UI & Navigation - Era-based autofocus, refactor era management dialogs through TTL

---

### [ ] The "Yet" (Future Events) Implementation
**ID:** `the_yet_implementation_20260428` | **Type:** feature

System for tracking and rendering scheduled-but-unlived events beyond the NOW node. Yet events are ghost nodes with dashed rails; they become permanent when the NOW node reaches their age.

**Spec:**
- Unfulfilled events exist beyond NOW in narrative timeline
- Fulfillment: NOW reaching a Yet event converts it to permanent history
- Rendering: ghosted nodes (lower opacity, outlined), dashed cyan rails after NOW
- Future events don't contribute to subjective age until fulfilled
- "Schedule Yet" dialog for adding future dates; drag-to-future interaction

**Plan:**
- Phase 1: Data & Engine - Define theYet schema in template.json, integrate into getTemporalState (flag isYet:true, place on 1:1 diagonal)
- Phase 2: Projection & Rendering - Ghost node styling in NodeRenderer, dashed rails in RailRenderer, fulfillment visual transition
- Phase 3: UI & Interaction - Schedule Yet dialog, drag-to-future interaction

---

### [~] Spanning Core Physics
**ID:** `spanning_core_physics_20260428` | **Type:** feature

Definitive span implementation. NOW node must persist at arrival point without snapback. Enforce standard property names (`eventAge`, `ts`, `arrivalTs`), world offset calculation, and new diagonal rail establishment after span arrival.

**Spec:**
- Property consistency: `eventAge` (s), `ts` (ms), `arrivalTs` (ms) as absolute naming standard
- World offset calculated by Temporal Engine based on span magnitude
- Span arrival establishes new 1:1 diagonal rail for subsequent progression
- Vertical lock during span drag (constant subjective age)
- Live preview with dotted pink span line
- Atomic sync of objectiveNow and subjectiveNow on save
- Interactive span insertion: click rail -> drag vertically -> live displacement propagation

**Plan:**
- Phase 1: Engine Purity - Audit property names, refactor establishHistoryPhysics for span authority [DONE]
- Phase 2: Interaction Logic - Standardize PointerMachine span calculation through TTL [DONE - insert-span mode with ghost-snap initiation, vertical drag, live displacement preview]
- Phase 3: Validation - Post-save handshake ensuring DB integers match visual coordinates

---

### [~] Historical Span Insertion
**ID:** `historical_span_insertion_20260428` | **Type:** feature

Insert spans into the character's past and propagate downstream time shifts. Every event after the insertion point gets its objective time shifted by the span's displacement magnitude.

**Spec:**
- Insertion creates vertical jump in objective time at age X
- Downstream shift: New_Time = Old_Time + Displacement for all events where sort > span.sort
- Narrative re-sequencing maintains chronological authority
- Ghost snapping along existing rail for departure age selection
- Vertical drag defines span magnitude
- Live preview of downstream shift during drag
- Floor constraint for up-spans: arrival cannot exceed next event's time
- Birth boundary for down-spans: arrival cannot precede origin time

**Plan:**
- Phase 1: Kernel Hardening - Propagation logic, compensation wave for downstream ts updates, insert-history-row for historical context [DONE]
- Phase 2: Interaction Machine - Two-step historical span drag (choose age via ghost-snap, choose magnitude via vertical drag), live propagation preview in manifest [DONE]
- Phase 3: UI - Refactor Insert Span dialog showing before/after objective times

---

### [ ] Space-Time Map Integration
**ID:** `spacetime_map_integration_20260428` | **Type:** feature

Bidirectional link between Lifeline events and the interactive map. Clicking a lifeline event pans the map to its coordinates; map interactions populate event location fields.

**Spec:**
- Outbound: clicking event on graph/spreadsheet triggers map pan/zoom to event lat/lng/zoom
- Inbound: dropping pin on map populates eventLocation/lat/lng in log dialogs
- Moving map marker updates event record in DB, triggers lifeline re-render
- All events/spans support eventLocation, lat, lng, zoom fields

**Plan:**
- Phase 1: Hooking - Map-sync hook on PointerMachine, update Map Manager for chronological events
- Phase 2: UI Integration - "View on Map" button in dialogs, "Grab Map Coordinates" button
- Phase 3: Bidirectional Persistence - Map marker drags sync to state via updateHistoryRow

---

### [ ] Main Character Sheet Integration
**ID:** `character_sheet_integration_20260428` | **Type:** feature

Migrate Lifeline Graph and Spreadsheet from standalone apps into primary character sheet as "Lifeline" and "History" tabs.

**Spec:**
- Tabbed interface: Lifeline tab (graph) and History tab (spreadsheet) in character sheet
- Persistent viewport: zoom/pan maintained across tab switches
- Temporal Engine and TTL called in prepareData cycle
- Real-time re-render on stat/history updates
- Graph scales responsively to sheet width

**Plan:**
- Phase 1: Tab Integration - Add tabs to character-sheet.html, embed viewport, initialize SpanGraph on tab render
- Phase 2: Wiring - Integrate getTemporalState into sheet prep, multi-window sync between graph and spreadsheet tabs
- Phase 3: Cleanup - Remove standalone app triggers

---

### [ ] UI/UX Fidelity & Readability Audit
**ID:** `ui_ux_fidelity_audit_20260428` | **Type:** chore

Polish visual and interactive components for long-term play. Label de-confliction, tooltip enhancement, high-contrast cues, and spreadsheet usability.

**Spec:**
- Label de-confliction algorithm for overlapping event titles
- Enhanced visual distinction between events, spans, Yet nodes
- Tooltips: hierarchical metadata (Era, Experience, Location, Recency Bonus)
- Spreadsheet: compact/comfortable row heights, era/experience filtering

**Plan:**
- Phase 1: Visual Audit - Label placement algorithm in manifest, node visibility enhancements in NodeRenderer
- Phase 2: Tooltip & Info Density - Multi-line categorized tooltips, optional era-colored rails
- Phase 3: Usability - Enhanced spreadsheet layout, real-time filter/search for event titles/locations

---

### [ ] Era Navigation & Drag Bar
**ID:** `era_navigation_bar_20260428` | **Type:** feature

Interactive macro-navigation bar at graph bottom. Era blocks proportional to duration, scrubber handle for current viewport position, draggable lens for pan/zoom control.

**Spec:**
- Era blocks with width proportional to subjective duration
- Timeline scrubber showing viewport center relative to full history
- Draggable lens overlay for panning main graph
- Click era block to jump to that era's start
- Drag lens edges to adjust zoom level
- Bidirectional sync with main viewport pan/zoom
- Fixed at graph bottom, small % of total height

**Plan:**
- Phase 1: Layout & Rendering - EraBarRenderer.js, integrate with manifest-generator for full history bounds
- Phase 2: Interaction Machine - Era bar click-to-pan, scrubber/lens dragging
- Phase 3: Synchronization - Bidirectional sync between main viewport and nav bar handle

---

## Archived Tracks

- [x] **Spanning Core Physics Fix** - Permanent fix for spanning core physics
- [x] **Temporal Translation Layer (TTL)** - 6 tasks: Age Converter, TTL docs, UI migration, Translator mapping, inbound data path, legacy utility wrapping
- [x] **Span Drawing Fix (Multi-Rail Rendering)** - Dual node rendering and multi-rail span paths
- [x] **Data Layer Purification** - Purified getActorHistory to return raw facts, created establishHistoryPhysics kernel unit
- [x] **The Umbilical Cord & Precision Handshake** - Stable pause point with unit-fragmented engine
- [x] **Fuzzy Collision Law** - Implemented fuzzy collision law in kernel
- [x] **Kernel Physics Walk Atomization** - Created project-subjective-age, calculate-span-displacement, atomized physics walk (FPF)
- [x] **Kernel Date-to-Timestamp Law** - Created parse-objective-timestamp physical law unit
- [x] **Era Data Decoupling** - Extracted era data for Projector, decoupled from actor object
- [x] **Ghost Node Manifest Projection** - Ghost node in manifest, PointerMachine decoupled from rendering
- [x] **Temporal Engine Unit Fragmentation** - Atomized get-temporal-state into era/projection/anchoring/finalization units
- [x] **Deep Decimation (ADI)** - Isolated Kernel, Projection Engine, and Dumb Renderers
- [x] **Codebase Stabilization** - Absolute ground-truth insertion, path fixes
- [x] **Lifeline Interaction & Span Physics Refinement** - Span rendering fixes, chronological sorting
- [x] **Lifeline HUD Refinement** - Ghost nodes, Experience boxes, The Forgetting fade
- [x] **Lifeline Span Logic & Dialog** - openSpanDialog, Log Span Result dialog (V13)
- [x] **NOW Node Interaction & Span Physics Rebuild** - Authoritative drag physics, node typography
- [x] **Lifeline Core Architecture Reset** - Sequential rails, responsive axis labels, projection fix
- [x] **Lifeline Interaction & Creation Toolkit** - Dynamic tooltips, NOW node drops, ghost insertion, era creation
- [x] **Lifeline Spreadsheet Integration** - Standalone app, data sync, bulk actions, CSV tools
- [x] **Visual Span Graph Viewport** - SVG viewport, rail renderer, pan/zoom, tooltips, grid, optimization
- [x] **Core Temporal Projection & Insertion Engine** - Segment projection, atomic insertion, span propagation, resilience tests