# Continuum FoundryVTT System

## Project Type
FoundryVTT game system (browser-based, no build step). ES modules loaded directly by Foundry.

## Entry Points
- `system.json` - System manifest (version, modules, templates, styles)
- `continuum.js` - Main actor sheet class (`ContinuumActorSheet`)
- `template.json` - Actor/item data schemas (character, organization, location actors; artifact, ability, gear items)

## Key Modules
- `modules/character/` - Character sheet logic (prepare-data, activate-listeners, item handlers)
- `modules/lifeline/` - Timeline/spreadsheet system (spreadsheet/, services/, events/)
- `modules/span-graph/` - Visual timeline rendering
- `modules/spacetime-bridge/` - Map integration (location markers, lifeline drawing)
- `modules/organization/` - Org sheet logic
- `modules/location/` - Location sheet logic
- `modules/relationships/` - Character relationship graph and timeline
- `modules/combat/` - Combat calculations
- `modules/npc-generator/` - AI-powered NPC generator wizard (6-step dialog)

## NPC Generator (modules/npc-generator/)

6-step wizard: Identity -> Time & Faction -> Capabilities -> Concept -> Review -> Complete.

**Data Flow:**
1. `npc-wizard-app.js` orchestrates the wizard, collects state via `npc-state.js`
2. `npc-ai-client.js` builds the prompt (type-aware lore injection from `npc-lore.js`) and calls Gemini/OpenRouter
3. `npc-actor-builder.js` creates the actor from AI response, then enriches with lifeline
4. `npc-lifeline-builder.js` builds ages/experiences/events from AI response (core lifeline engine)
5. `npc-geocoder.js` resolves locations (Location actors first, Nominatim fallback)
6. After creation, Step 6 (`step-6-complete.html`) offers PC linking via `linkToPC()`

**Lifeline Architecture (npc-lifeline-builder.js):**
- `buildAges()`: Uses AI-provided ages array OR falls back to hardcoded defaults by NPC type
- `buildExpMapFromAI()`: Merges experience data from both `foundryJson.experiences` array AND `foundryJson.lifelineEvents` (using `experienceId`/`isExpStart`/`isExpEnd` to discover experiences)
- `buildEvents()`: Creates start/end bracket events for experiences missing them, routes events into age.events or age.experiences[expId].events based on `_expId` markers
- Experience bracketing: start events get `startsExpId`, end events set `isOngoing: false` and `dateTo`
- `processAIProvidedAges()` handles both array and object formats from AI responses
- Cross-age end events: if an experience ends in a different age than it started, the end event is placed in the correct experience's events

**AI Prompt Constraints (npc-ai-client.js):**
- Ages = life stages (Childhood, Career, etc.) with no overlaps/gaps. Experiences = specific activities (University, Military Service) with start/end dates
- Both Gemini and OpenRouter response schemas include `ages` (array), `experiences` (array), `lifelineEvents` (array with `isExpStart`/`isExpEnd`/`isRest`/`experienceId`)
- Duration rules in prompt: explicit realistic durations per type (High School 3-5 years, University 3-5 years, etc.)
- Chronological ordering rules: education ends before career, no overlapping school/career unless simultaneous
- Span Pool Rules: Span N has max 10^(N-1) km per jump, 10^(N-1) years cumulative time pool, 24h rest to refill
- `isRest: true` events mark 24-hour recovery periods when span pool is exhausted
- Spatial travel is summarized in one event, not itemized as multiple short spans
- Self-verification instruction before returning JSON including span pool consistency check

**Known Issues:**
- Console logging added to `enrichActorLifeline` and `buildLifeline` for debugging lifeline construction
- Ages schema was missing from response schemas (fixed - both now include `ages` as ARRAY type)

## Critical Convention: ES Module Paths
Always use `.js` extensions in import paths (Foundry requirement):
```js
import { foo } from './modules/foo.js';  // correct
import { foo } from './modules/foo';    // wrong
```

## Lifeline Spreadsheet (modules/lifeline/spreadsheet/)
- **Do not re-implement span insertion** - Use `createInsertedSpan` from `modules/lifeline/services/spans/create-inserted-span.js`. The lifeline has special compensators that prevent timeline shifts on insert.
- When editing an event, update both the node location AND any associated Experiences (see `modules/lifeline/docs/spreadsheet-persistence.md`).
- Location data in spreadsheet events does NOT auto-link to SpaceTime map - this is a known gap (prompt.txt).

## PowerShell Commands
The repo uses PowerShell (not Bash). Key rules from `.clinerules`:
- Pass commands as plain strings: `"echo Hello"`
- Chain with semicolons: `"echo First; echo Second"`
- Do NOT use JSON arrays or objects in commands

## Python Scripts
`fix-*.py` scripts modify template HTML files in-place. Run with `python fix-*.py`.

## Testing & Diagnostics

### Playwright Browser Automation

The `playwright-cli` skill is installed for browser automation, testing, and visual diagnostics.

**CRITICAL: Non-Blocking Session Pattern**

`playwright-cli open` blocks the shell when called as a standalone command - it waits for the JS await to resolve and return page output. The ONLY safe way to open a session is by spawning `open` via `cmd.exe` in a hidden background process. After that, individual commands work per-call with named persistent sessions.

**Key Rules:**
1. **NEVER call `playwright-cli open` directly** - it blocks waiting for the JS await
2. **ALWAYS use `Start-Process -WindowStyle Hidden`** for open/close to avoid popup windows
3. **ALWAYS use named sessions with `-s=<name>`** - unnamed sessions don't persist
4. **ALWAYS use `--persistent`** - without it, the browser closes after each command
5. **Use single quotes** for arguments with spaces (`fill e42 'text with spaces'`)

**Step 1: Open session (non-blocking, no popup)**
```powershell
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=<SESSION> open <URL> --persistent' -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 5
playwright-cli -s=<SESSION> resize 1920 1080
playwright-cli -s=<SESSION> run-code "async page => { await page.waitForLoadState('networkidle'); }"
```

**Step 2: Interact (individual commands, per-call)**
```powershell
playwright-cli -s=<SESSION> snapshot
playwright-cli -s=<SESSION> click e5
playwright-cli -s=<SESSION> fill e3 'text input'
playwright-cli -s=<SESSION> screenshot --filename=result.png
```

**Step 3: Close session (no popup)**
```powershell
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=<SESSION> close' -WindowStyle Hidden -Wait
```

**Why this matters:**
- `open` blocks the shell because it awaits the page load JS promise
- `Start-Process` with `cmd.exe /c` avoids blocking by running in a separate process
- `-WindowStyle Hidden` prevents visible cmd/powershell popup windows
- `-PassThru` returns the process object so you can capture the PID if needed
- Named sessions (`-s=<name>`) target a specific browser instance per command
- `--persistent` keeps the browser daemon alive between individual commands
- After `open`, all other commands (`snapshot`, `click`, `fill`, `screenshot`, `close`) are non-blocking and work per-call
- Close uses `-Wait` to ensure clean shutdown

**Full Workflow Example (Foundry login):**
```powershell
# 1. Open session in background (no popup)
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=fvtt open http://192.168.1.101:30000/ --persistent' -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 5

# 2. Set resolution and wait for full load (Foundry/SpaceTime can take up to 30s)
playwright-cli -s=fvtt resize 1920 1080
playwright-cli -s=fvtt run-code "async page => { await page.waitForLoadState('networkidle'); }"

# 3. Each command is its own call - no blocking
playwright-cli -s=fvtt snapshot
playwright-cli -s=fvtt select e17 "Browser"
playwright-cli -s=fvtt click e24

# 4. Wait for game board to fully load (SpaceTime map can take up to 30s)
playwright-cli -s=fvtt run-code "async page => { await page.waitForLoadState('networkidle'); }"
playwright-cli -s=fvtt screenshot --filename=game-board.png

# 5. Close when done (no popup)
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=fvtt close' -WindowStyle Hidden -Wait
```

**Quick Screenshot (one-liner alternative):**
For simple capture-only tasks, chaining still works:
```powershell
playwright-cli open http://192.168.1.101:30000/; playwright-cli screenshot --filename=page.png; playwright-cli close
```

**Named Sessions vs Default Session:**
| Aspect | Named Session (`-s=name`) | Default Session |
|--------|---------------------------|-----------------|
| Isolation | Multiple independent sessions | Single session |
| Persistence | `--persistent` keeps daemon alive | Daemon may exit between calls |
| Targeting | `-s=name` targets specific session | All commands go to same session |
| Use case | Multi-step workflows, LM interaction | Single chained invocations |

**Session Management:**
```powershell
playwright-cli list                    # List active sessions
playwright-cli -s=<name> close         # Close named session
playwright-cli close-all               # Close all sessions
playwright-cli kill-all                # Force kill all browser processes
```

**Emergency Cleanup (if session is stuck):**
```powershell
playwright-cli close-all; playwright-cli kill-all
```

**Wait Strategies for Page Loads:**
- Always run `resize 1920 1080` after opening to meet Foundry's minimum resolution (1366x768)
- Always run `waitForLoadState('networkidle')` after opening a page - the SpaceTime map can take up to 30 seconds to fully load
- Run `waitForLoadState('networkidle')` again after any navigation (e.g., logging in, switching scenes)
- The full startup pattern is: `open` -> `Start-Sleep 5` -> `resize 1920 1080` -> `waitForLoadState('networkidle')`
- For individual elements: use `playwright-cli -s=<name> run-code "async page => { await page.locator('.ready-indicator').waitFor({ state: 'hidden', timeout: 30000 }); }"`
- Check readiness with `playwright-cli -s=<name> list` to confirm session is open

**PowerShell Quoting Note:**
Use single quotes for arguments with spaces to avoid PowerShell splitting:
```powershell
# WRONG - PowerShell splits on spaces
playwright-cli -s=fvtt fill e42 text with spaces

# CORRECT - single quoted string as one argument
playwright-cli -s=fvtt fill e42 'text with spaces'
```

**Key Commands (per-call after session is open):**
| Command | Purpose |
|---------|---------|
| `resize 1920 1080` | Set viewport resolution (always run after open) |
| `snapshot [--filename=f.yml]` | Capture page structure with element refs |
| `screenshot [--filename=f.png]` | Capture screenshot |
| `click <ref>` | Click element by ref |
| `fill <ref> 'text'` | Fill text input (single quotes for spaces) |
| `select <ref> 'value'` | Select dropdown option (single quotes for spaces) |
| `press <key>` | Press keyboard key |
| `goto <url>` | Navigate to new URL |
| `run-code "async page => { ... }"` | Run arbitrary Playwright code (wait, evaluate, etc.) |
| `list` | List active sessions |
| `close` | Close browser session (use `Start-Process -WindowStyle Hidden -Wait` to avoid popup) |

**Testing Documentation:**
See `TESTING-RULES.md` for comprehensive testing procedures and Foundry-specific test scenarios.

**Deprecated: `playwright-shim.psm1`** - The PowerShell shim module is no longer needed. The `Start-Process` pattern with named persistent sessions replaces it entirely.

### Automated Foundry Launch for Testing

A batch file is provided to launch Foundry VTT directly into the Continuum world for automated testing:

**Location:** `tools/launch-continuum.bat` (gitignored, environment-specific)

**Usage:**
```batch
# Launch with default port (30000)
tools\launch-continuum.bat

# Launch with custom port
tools\launch-continuum.bat 30001
```

**What it does:**
- Launches `Foundry Virtual Tabletop.exe` from `D:\Program Files\Foundry Virtual Tabletop`
- Passes `--world=continuum` to jump directly into the Continuum world
- Passes `--port=<port>` to specify the server port
- Opens Foundry in the default browser automatically

**Configuration:**
The batch file uses the following defaults:
- Foundry Path: `D:\Program Files\Foundry Virtual Tabletop\Foundry Virtual Tabletop.exe`
- World: `continuum` (matches the world ID in `world.json`)
- Port: `30000` (configurable via command line argument)

**Foundry CLI Flags Used:**
- `--world=<id>` - Launch directly into a specific world (lowercase ID from world folder name)
- `--port=<number>` - TCP port for Foundry to listen on
- See https://foundryvtt.com/article/configuration/ for all available flags

### Process Management for Automated Testing

When automating tests, you may need to start/stop Foundry programmatically:

**Start Foundry (PowerShell):**
```powershell
# Start Foundry in Continuum world
Start-Process "D:\Program Files\Foundry Virtual Tabletop\Foundry Virtual Tabletop.exe" -ArgumentList "--world=continuum", "--port=30000"

# Wait for server to be ready
Start-Sleep -Seconds 10
```

**Check if Foundry is Running:**
```powershell
# Check if Foundry process exists
Get-Process | Where-Object { $_.ProcessName -like "*foundry*" -or $_.ProcessName -like "*Foundry*" }

# Or check if port 30000 is listening
Get-NetTCPConnection -LocalPort 30000 -ErrorAction SilentlyContinue
```

**Stop Foundry (taskkill):**
```powershell
# Graceful shutdown (sends close signal)
taskkill /IM "Foundry Virtual Tabletop.exe" /T

# Force kill if graceful doesn't work (use with caution)
taskkill /F /IM "Foundry Virtual Tabletop.exe" /T

# PowerShell alternative
Stop-Process -Name "Foundry Virtual Tabletop" -Force
```

**Complete Automated Test Workflow:**
```powershell
# 1. Start Foundry
Start-Process "D:\Program Files\Foundry Virtual Tabletop\Foundry Virtual Tabletop.exe" -ArgumentList "--world=continuum", "--port=30000"
Start-Sleep -Seconds 15

# 2. Start browser session (non-blocking, no popup)
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=test open http://192.168.1.101:30000/ --persistent' -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 5

# 3. Set resolution and wait for full load (Foundry/SpaceTime can take up to 30s)
playwright-cli -s=test resize 1920 1080
playwright-cli -s=test run-code "async page => { await page.waitForLoadState('networkidle'); }"

# 4. Interact per-call
playwright-cli -s=test snapshot
playwright-cli -s=test select e17 "Browser"
playwright-cli -s=test click e24

# 5. Wait for game board to fully load
playwright-cli -s=test run-code "async page => { await page.waitForLoadState('networkidle'); }"
playwright-cli -s=test screenshot --filename=test-result.png

# 6. Close session (no popup), then stop Foundry
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=test close' -WindowStyle Hidden -Wait
taskkill /IM "Foundry Virtual Tabletop.exe" /T
```

### No Unit Test Framework
This codebase has no unit test suite. Manual testing in FoundryVTT and Playwright browser automation are used for validation.

## Data Model
- Actor data stored in `actor.system.*` (attributes, ages, experiences, events, etc.)
- Lifeline rows: `actor.system.ages[ageId].experiences[expId].events[eventId]`
- Spanning skills/abilities: `actor.system.spanning.skills` and `actor.system.spanning.abilities`

## CSS Architecture
Styles are split by feature in `styles/` directory. Main `continuum.css` handles dynamic background images by fraternity.

## Handlebars Helpers
Registered in `continuum.js` `Hooks.once('init')`. Currently: `resourceState`.

## Known Architecture Notes
- V13 compatibility: `const BaseActorSheet = foundry.appv1?.sheets?.ActorSheet ?? ActorSheet`
- Actor sheets use `submitOnChange: true` and `closeOnSubmit: false`
- Drag-drop handled by `continuum-drag-drop.js` and `modules/network/handle-actor-drop.js`

## Insights Recording

When working on tasks, record meaningful insights, discoveries, and process learnings to the `insights/` folder.

- Create markdown files with descriptive names: `insights/YYYY-MM-DD-brief-description.md`
- Include context: what was the problem, what was discovered, and any recommendations
- This folder is gitignored - these are personal working notes, not project documentation
- Use this to build up knowledge about the codebase over time
