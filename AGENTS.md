# AGENTS.md - Continuum V2 System

> **See also: [FILELIST.md](./FILELIST.md)** - Complete inventory of all 670+ source files with layer annotations, purposes, and exports.

## Project Overview

Continuum V2 is a **Foundry VTT v13** game system for the Continuum RPG - a time-travel tabletop RPG where characters navigate non-linear timelines. The system models characters' lifelines as 2D spacetime graphs (X = Objective Date, Y = Subjective Age) with physics-based spanning (time travel), level breathing (aging), and paradox mechanics.

The core architectural principle is **Database as Authority**: the app is a database with a UI on the front, not a tool with a database on the back. All state lives in a flat sorted history array. The UI is a dumb projector that renders DB rows into pixels.

---

## The Trinity Architecture

All code must follow the **Trinity** separation - three non-overlapping components:

### A. STATE (Database Layer) - `modules/state/`
- Holds the **Flat History Array** - the single source of truth
- Handles atomic mutations: `insertRow`, `updateRow`, `deleteRow`
- Self-sorts and calculates subjective age offsets
- Files: `get-actor-history.js`, `insert-history-row.js`, `update-history-row.js`, `delete-history-row.js`, `resolve-record-path.js`, `get-lore-context.js`

### B. KERNEL (Rules Layer) - `modules/temporal-kernel/`
- Pure, stateless functions enforcing Continuum physics
- Validation: span legality, pool consumption, displacement calculation, collision laws
- The **only** thing allowed to tell the DB how to change
- Files: `apply-collision-laws.js`, `calculate-span-displacement.js`, `establish-history-physics.js`, `project-diagonal.js`, `project-subjective-age.js`, `resolve-narrative-order.js`, `solve-history-physics.js`, `solve-now-drag-constraint.js`, `validate-span-physics.js`

### C. PROJECTOR (View Layer) - `modules/span-graph/renderers/`
- Dumb pipes receiving a **Render Manifest** (JSON list of X/Y pixels)
- Only math allowed: World-to-Screen coordinate conversion
- Zero domain logic - renderers must not know what a Span or Era is
- Files: `axis-renderer.js`, `creation-renderer.js`, `era-renderer.js`, `experience-renderer.js`, `grid-renderer.js`, `node-renderer.js`, `rail-renderer.js`

---

## Execution Flow (The Unbreakable Loop)

1. **User Clicks** a pixel
2. **Projector** converts pixel to `Age/Time` and sends to **Kernel**
3. **Kernel** validates against character laws and sends update to **DB**
4. **DB** updates, re-sorts, and broadcasts a "Changed" event
5. **Projector** receives event, wipes the SVG, and re-draws based on new DB state

**NO HACKS. NO PATCHES. THE DATABASE IS THE ONLY TRUTH.**

---

## Directory Structure

```
continuum-v2/
  continuum.js                    # Main ActorSheet class + init hooks
  system-api.js                   # Public API surface
  system.json                     # Foundry system manifest
  template.json                   # Data schema (character, organization, location + items)
  
  modules/
    state/                        # TRINITY A: Database layer
    temporal-kernel/              # TRINITY B: Rules layer (pure functions)
    temporal-engine/              # Pipeline orchestrator (state -> kernel -> projection)
      commands/                   # insert-event.js, insert-span.js
    temporal-translator/          # TTL - bidirectional string <-> number conversion
      age-converter.js            # Subjective time (seconds)
      coordinate-converter.js     # Objective time (ms), location-aware
      location-resolver.js        # Reverse-walk for IANA timezone mapping
    
    span-graph/                   # TRINITY C: Projector + viewport + interaction
      renderers/                  # Dumb SVG renderers (axis, era, grid, node, rail, etc.)
      actions/                    # auto-center, drag-physics
      projection/                 # manifest-generator.js
      interaction/                # pointer-machine, ghost-snap, pointer-mode
      ui/                         # tooltips.js, tooltips.css
      integration/                # sheet-handler.js (connects to ActorSheet)
      viewport/                   # listeners + actions (pointer-down/move/up, zoom, pan)
      
    lifeline/                     # Legacy lifeline module (being replaced by span-graph)
      spreadsheet/                # CSV import/export, batch edit, spreadsheet UI
      validators/                 # chronology.js
      handlers/                   # click, hover, context-menu, head-node, roll-action
      events/                     # pointer-down/move/up handlers
      painters/                   # SVG drawing services
      calculators/                # age/timestamp math
      factory/                    # node/event factories
      services/                   # business logic services
      
    character/                    # Character sheet: listeners, handlers, data prep
    organization/                 # Organization sheet: 50+ files, org-graph, network, economics
    location/                     # Location sheet: activate-listeners, prepare-data
    spacetime-bridge/             # Bridge between span-graph and Foundry map overlay
    combat/                       # combat-socket, defender-profile, mitigation-engine
    network/                      # handle-actor-drop.js (drag actors onto map)
    npc-generator/                # AI NPC builder (Gemini/OpenRouter)
    relationships/                # Character relationship graph, timeline, render
    
    sheet-*.js                    # Sheet infrastructure (hooks, handlers, listeners, UI)
    span-graph-*.js               # Legacy span-graph files
    viewport-controller.js        # Viewport pan/zoom
    
  styles/                         # Modular vanilla CSS (one file per feature)
  templates/                      # Handlebars templates
    dialogs/                      # Span-graph dialogs
    sections/                     # Sheet sections
    apps/                         # Lifeline spreadsheet app
    items/                        # Item templates
  tests/                          # Vitest unit tests
    state/                        # State layer tests
    temporal-kernel/              # Kernel layer tests
    temporal-engine/              # Engine pipeline tests
    temporal-translator/          # TTL tests
    lifeline/                     # Lifeline tests
    lifeline-spreadsheet/         # Spreadsheet tests
    span-graph/                   # Span-graph tests
  conductor/                      # Project tracking (tracks, archive, plans)
  docs/                           # Documentation
```

---

## Key Systems

### Temporal Engine (`modules/temporal-engine/`)
The pipeline orchestrator. Reads state, runs kernel physics, produces render manifests.
- `get-temporal-state.js` - Assembles full temporal state from actor data
- `calculate-segments.js` - Breaks history into chronological segments
- `project-nodes.js` - Projects nodes to screen coordinates
- `resolve-coordinates.js` - Resolves world coordinates
- `extract-eras.js` - Extracts era data from history
- `anchor-segments.js` - Anchors segments to timeline
- `finalize-state.js` - Final state preparation
- `commands/` - Mutation commands (insert-event, insert-span)

### Temporal Translator / TTL (`modules/temporal-translator/`)
The bidirectional "air gap" between human-readable strings and pure math integers.
- **Age Converter** - Subjective time in seconds
- **Coordinate Converter** - Objective time in ms, strictly enforcing character-local chronology over UTC/system clocks
- **Location Resolver** - Reverse-walks history to map locations to IANA timezones

### Span Graph (`modules/span-graph/`)
The primary visualization. Receives a Render Manifest and draws pixels.
- **Renderers** - Individual SVG drawing functions (one concept per file)
- **Viewport** - Pan/zoom/interaction handling
- **Interaction** - Pointer machine, ghost node snapping, mode resolution
- **Projection** - Generates render manifests from temporal state
- **Integration** - Connects to the ActorSheet

### Lifeline (`modules/lifeline/`)
Legacy module being gradually replaced by span-graph. Still handles spreadsheet UI and some interaction patterns.

---

## Actor Types

- **Character** (`character`) - Full lifeline, spanning, attributes, metabilities, combat
- **Organization** (`organization`) - Org graph, network, economics, dialog trees, mandates
- **Location** (`location`) - Map integration, timezone anchoring

## Item Types

- `artifact`, `ability`, `gear`

---

## Testing

Run with: `npm test` (uses Vitest, ESM mode, `vitest.config.js`)

Test paths alias `/systems/continuum-v2` to project root. Tests exist for:
- `tests/state/` - State layer
- `tests/temporal-kernel/` - Kernel physics functions
- `tests/temporal-engine/` - Engine pipeline (commands, projection, segments)
- `tests/temporal-translator/` - TTL conversion functions

### Testing Policy

#### Boundary-Trace Testing (Mandatory)

Every function that transforms data across a layer boundary MUST have tests verifying all
valid input paths produce correct output. A "boundary" is any point where data passes from
one module to another (Kernel -> State, TTL -> Kernel, PointerMachine -> Dialog, etc.).

The bugs this system has suffered share a common pattern: **data crosses a boundary and
loses its semantic meaning**. Example: a level drag produces `eventIsSpan: false` at the
interaction layer, but by the time it reaches the state layer, `hasSpanFacts` re-derives
`eventIsSpan: true` from stale span field values in the dialog template. The boolean intent
was overruled by derived facts that should have been identical for level events.

**Rule: If a function's output can change the meaning of the data (level vs span, origin
vs arrival, departure vs endpoint), test that every semantic path produces the correct
Boolean flag or enum value at the output.**

Specific requirements:

1. **Every Kernel output function MUST have a test** for each distinct physical mode:
   - `establishHistoryPhysics` - test with `isSpanIntent: true` vs `false`, verify
     `isSpanOrigin` is set correctly on the NOW node in both cases
   - `solveNowDragConstraint` - test with level-drag coordinates vs span-drag
     coordinates, verify mode and world coordinates match the correct diagonal/vertical
   - `resolvePointerMode` - test with 30-degree diagonal, near-vertical, and
     near-horizontal pointer movements

2. **Every TTL toHuman/toAtomic round-trip MUST preserve semantic identity**:
   - A level event's `toHuman` output, fed into `toAtomic`, MUST produce
     `eventIsSpan: false` and `arrivalTs === ts`
   - A span event's round-trip MUST produce `eventIsSpan: true` and
     `arrivalTs !== ts`
   - Test both directions (human -> atomic -> human, atomic -> human -> atomic)

3. **Dialog template data preparation MUST be tested for each mode**:
   - `getTemplateData` for `mode: 'log'` with `eventIsSpan: false` MUST produce
     `arrivalTs === ts` (departure equals arrival)
   - `getTemplateData` for `mode: 'log'` with `eventIsSpan: true` MUST produce
     `arrivalTs !== ts` when departure and arrival differ
   - `getTemplateData` for `mode: 'edit'` with existing span data MUST preserve
     the span's `arrivalTs`

4. **handle-submit MUST be tested for the hasSpanFacts edge case**:
   - Level event with identical From/To fields -> `eventIsSpan: false`
   - Level event with populated but identical span fields -> `eventIsSpan: false`
   - Span event with different To/From fields -> `eventIsSpan: true`

5. **Nullable/optional parameter chains MUST have explicit null-path tests**:
   - Every function that reads `params.something?.subproperty` MUST have a test
     where the optional chain evaluates to `null`/`undefined`, verifying the
     fallback value is correct AND the semantic meaning is preserved
   - Example: `params.departure?.eventTime` falling through to `params.timeRaw`
     MUST place the event at the drop position, not the drag start

#### Mode-Coverage Standard

Any function with a mode switch (level/span/insert-span, edit/log) must have at least
one test per mode. Missing a mode in tests means missing a bug class.

#### Regression Tests for Known Bug Classes

When fixing a bug, add a regression test that would have caught it. The test should
assert the specific semantic invariant that was violated:

- "level drag MUST NOT produce `isSpanOrigin: true` on the NOW node"
- "level event template data MUST have `arrivalTs === departureTime`"
- "`hasSpanFacts` MUST be false when departure and arrival are identical"
- "`departure?.eventTime` null path MUST fall through to `timeRaw` for level events"

---

## Reminders

### Architecture
- **Database is authority**. UI is a lens. Never let the view write directly to state.
- **Trinity separation is mandatory**. State, Kernel, Projector must never overlap.
- **Function-Per-File** (FPF): No file over 150 lines. Every mutation, rule, and renderer gets its own file.
- **Property Isolation**: Facts (Date/Time strings) and Physics (X/Y coordinates) must never share property names.
- **Absolute Pathing**: Use `/systems/continuum-v2/modules/...` for all imports.

### Code Style
- ES Modules only (`import`/`export`). No default exports.
- Named exports: `export { MyClass };`
- `.js` extension mandatory in import paths
- 2-space indent, no tabs
- Single quotes for strings, template literals for interpolation
- `const` by default, `let` if reassignment needed, `var` forbidden
- K&R braces, semicolons required
- 80-character column limit
- `lowerCamelCase` for functions/variables, `UpperCamelCase` for classes, `CONSTANT_CASE` for constants
- No em-dash (--) in comments - use regular dash (-)
- No emoji, Unicode symbols, or non-ASCII in comments
- Use `->` not arrow ligatures in comments
- Use `//` for single-line, `/* ... */` for multiline (no leading `*` on interior lines)
- Section headers: `// SECTION NAME` (not dash chains)
- **Explanatory comments are required**, not optional. Every function, non-trivial code block, and decision point must have a `//` comment explaining the *why* - not just the *what*. Future readers (including AI agents) need context about intent, constraints, and trade-offs. Err on the side of too many comments rather than too few.
- JSDoc `@param`/`@returns` on all exported functions describing what they do, what they expect, and what they produce. Include units (e.g., "seconds since birth", "epoch ms") where applicable.

### UX
- Physical honesty: the graph must never guess, snap, or round unless dictated by Span Rank
- Zero drift: visual representation must be 100% synchronized with the database
- Millisecond accuracy is the baseline
- High-contrast dark palette: bg `#000000`, level rails `#00e5ff`, spans `#ff00ff`, NOW `#ffd700`
- Tooltips must use double-pass HTML-in-SVG measurement (shrink-wrap, no drift)

### Foundry-specific
- Foundry VTT v13 API (`foundry.appv1.sheets.ActorSheet`)
- Handlebars `.hbs` templates for rendering
- SVG for all interactive timeline visualization
- `system.json` declares esmodules, styles, actor types, item types
- `template.json` defines the data schema

### Image Analysis
Use `MiniMax_understand_image` for analyzing images (screenshots, diagrams, UI states).
- Input: `image_source` (file path or URL) and `prompt` describing what to extract
- Supports JPEG, PNG, WebP formats
- Returns text description of image content
- When an image is received as a filename only, check `C:\Users\Tuck\Pictures\Screenshots` for the full path

### Data Flow
- User action -> Projector converts pixel coordinates -> Kernel validates physics -> DB updates -> DB broadcasts change -> Projector redraws from new DB state
- Never short-circuit this loop. Never write UI state directly.

### Legacy Code
- `modules/lifeline/` is being replaced by `modules/span-graph/`. New features go in span-graph.
- Root-level `span-graph-*.js` files are legacy. New code goes in `modules/span-graph/` subdirectories.
- `modules/sheet-*.js` files are sheet infrastructure. Prefer modular subdirectories.

### Issue Tracking
- **`ISSUES.md`** - Known bugs and user-reported defects
- When the user reports a bug or defect, log it in `ISSUES.md` immediately
- Follow the issue format (ID, Reported, Status, Summary, Details, Resolution)
- Update status to `[in-progress]` when work starts, `[resolved]` when fixed
- Keep issues newest-first; increment ID from the last entry

### Project Tracking
- **`TRACKS.md`** - Full track register with specs, plans, and status for all active and archived tracks
- `conductor/` holds project tracks, plans, specs, and archive
- Active tracks in `conductor/tracks/`
- `conductor/workflow.md` governs the development lifecycle
- `conductor/tech-stack.md` documents technology choices
- `conductor/code_styleguides/` has JavaScript, HTML/CSS, and general style rules

### Active Tracks Summary
See **`TRACKS.md`** for full specs and implementation plans.

| Status | Track | Description |
|--------|-------|-------------|
| [~] | Experiences Management & Rendering | Event containers, recency bonus, The Forgetting opacity fade |
| [ ] | Eras Structural Refinement | Era duration rules, downward propagation, overarching labels |
| [ ] | The Yet (Future Events) | Ghost nodes for scheduled-but-unlived events, dashed future rails |
| [ ] | Spanning Core Physics | Definitive span persistence, new diagonal rail establishment |
| [ ] | Historical Span Insertion | Insert spans in past, propagate downstream time shifts |
| [ ] | Space-Time Map Integration | Bidirectional link between lifeline events and map |
| [ ] | Main Character Sheet Integration | Embed lifeline/spreadsheet as tabs in character sheet |
| [ ] | UI/UX Fidelity Audit | Label de-confliction, tooltip enhancement, spreadsheet filtering |
| [ ] | Era Navigation & Drag Bar | Macro-navigation bar with era blocks and scrubber handle |

### Key Documents
- `REBUILD_MANDATE.md` - The architectural constitution (Trinity, DB-first, FPF)
- `UI_UX_GUIDE.md` - UI/UX authoritative guide (physical honesty, tooltip architecture, visual aesthetics)
- `FILELIST.md` - Complete inventory of all 670+ source files with layer annotations, purposes, and exports
- `TRACKS.md` - Consolidated track register with specs, plans, and status for all active and archived tracks
- `conductor/product-guidelines.md` - Product-level UX principles
- `conductor/tech-stack.md` - Technology stack documentation
- `conductor/code_styleguides/javascript.md` - Google JS style guide summary

---

## MiniMax MCP Tools

This project has a MiniMax MCP relay configured via `opencode.json`. Available tools:

| Tool | Description |
|------|-------------|
| `web_search` | Web search via MiniMax |
| `understand_image` | Analyze images (JPEG, PNG, WebP) |

The MCP is enabled and runs via `uvx minimax-coding-plan-mcp`. API key is configured in `opencode.json`.
Do not commit `opencode.json` to version control - it contains a live API key.