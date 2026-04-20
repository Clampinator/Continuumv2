# Continuum FoundryVTT Testing Rules
# URL: http://192.168.1.101:30000/
# Last Updated: 2026-04-12

## Overview

This document defines the testing procedures and navigation rules for the Continuum FoundryVTT instance running at http://192.168.1.101:30000/. These rules serve as the foundation for automated testing using playwright-cli.

## Environment

- **Base URL**: http://192.168.1.101:30000/
- **System**: Continuum (FoundryVTT Game System)
- **Foundry Version**: 13 Build 346
- **Test Account**: Browser (no password required)
- **Alternative Accounts**: Guest (no password), Clyax, Evelyn, Hex, Nemo, Ryan, Sub, TallTower (passwords required)
- **Gamemaster Account**: Requires password

## CRITICAL: Non-Blocking Session Pattern

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

## Page Structure: Join Page (/join)

### Element Reference Map

| Element | Reference | Type | Description |
|---------|-----------|------|-------------|
| Username Dropdown | e17 | combobox | User selection dropdown |
| Password Field | e22 | textbox | Password input (optional for Browser/Guest) |
| Join Button | e24 | button | Submit join form |
| Return to Setup Password | e42 | textbox | Admin password field |
| Return to Setup Button | e44 | button | Return to world setup |

### Username Options
- Browser (no password, recommended for testing)
- Guest (no password)
- Clyax
- Evelyn
- Hex
- Nemo
- Ryan
- Sub
- TallTower
- Gamemaster (requires password)

### Page Sections
1. **Join Game Session** (ref=e11)
   - Username selector (ref=e17)
   - Password field (ref=e22)
   - Join button (ref=e24)

2. **Game Details** (ref=e25)
   - Next Session indicator (ref=e28)
   - Current Players: 1/10 (ref=e30)

3. **Return to Setup** (ref=e37)
   - Admin password field (ref=e42)
   - Return button (ref=e44)

4. **World Description** (ref=e45)
   - Empty article section

### Element Reference Lifecycle

Element references (e.g., e17, e24) are **session-specific**:
- Refs may change between browser sessions
- Always capture a snapshot to get fresh refs before interacting
- Refs are stable within a single persistent session (after initial load)

## Test Scenarios

### Scenario 1: Join Page Load Test
**Purpose**: Verify join page loads correctly

```powershell
# Open session in background (no popup)
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=join open http://192.168.1.101:30000/ --persistent' -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 5
playwright-cli -s=join resize 1920 1080
playwright-cli -s=join run-code "async page => { await page.waitForLoadState('networkidle'); }"

# Capture page state
playwright-cli -s=join screenshot --filename=join-page.png

# Close session (no popup)
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=join close' -WindowStyle Hidden -Wait
```

Assertions:
- Page title should be "Continuum"
- URL should be http://192.168.1.101:30000/join
- Username dropdown should be visible
- Join button should be visible

### Scenario 2: Login with Browser Account
**Purpose**: Test authentication flow with Browser account

```powershell
# Open session in background (no popup)
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=login open http://192.168.1.101:30000/ --persistent' -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 5
playwright-cli -s=login resize 1920 1080
playwright-cli -s=login run-code "async page => { await page.waitForLoadState('networkidle'); }"

# Verify page loaded and capture fresh refs
playwright-cli -s=login snapshot

# Select Browser user from dropdown (ref=e17)
playwright-cli -s=login select e17 "Browser"

# Click Join Game Session button (ref=e24)
playwright-cli -s=login click e24

# Wait for game board to fully load (SpaceTime map can take up to 30s)
playwright-cli -s=login run-code "async page => { await page.waitForLoadState('networkidle'); }"

# Capture game board state
playwright-cli -s=login screenshot --filename=game-board.png

# Close session (no popup)
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=login close' -WindowStyle Hidden -Wait
```

Note: If element refs have changed, use `playwright-cli -s=login snapshot` to get fresh refs before interacting.

### Scenario 3: Visual Regression - Join Page
**Purpose**: Detect UI changes on join page

```powershell
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=regression open http://192.168.1.101:30000/ --persistent' -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 5
playwright-cli -s=regression resize 1920 1080
playwright-cli -s=regression run-code "async page => { await page.waitForLoadState('networkidle'); }"
playwright-cli -s=regression screenshot --filename=baseline-join-page.png
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=regression close' -WindowStyle Hidden -Wait
```

### Scenario 4: Username Dropdown Test
**Purpose**: Verify all expected users are present

```powershell
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=users open http://192.168.1.101:30000/ --persistent' -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 5
playwright-cli -s=users resize 1920 1080
playwright-cli -s=users run-code "async page => { await page.waitForLoadState('networkidle'); }"
playwright-cli -s=users snapshot
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=users close' -WindowStyle Hidden -Wait
```

Expected users in dropdown: Browser, Guest, Clyax, Evelyn, Hex, Nemo, Ryan, Sub, TallTower, Gamemaster

### Scenario 5: Game Session Navigation
**Purpose**: Test navigation within game session

```powershell
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=game open http://192.168.1.101:30000/ --persistent' -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 5
playwright-cli -s=game resize 1920 1080
playwright-cli -s=game run-code "async page => { await page.waitForLoadState('networkidle'); }"

# Login
playwright-cli -s=game select e17 "Browser"
playwright-cli -s=game click e24

# Wait for game board to fully load (SpaceTime map can take up to 30s)
playwright-cli -s=game run-code "async page => { await page.waitForLoadState('networkidle'); }"

# Capture game UI state
playwright-cli -s=game snapshot

# Close session (no popup)
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=game close' -WindowStyle Hidden -Wait
```

## Performance Benchmarks

### Page Load Metrics
```powershell
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=perf open http://192.168.1.101:30000/ --persistent' -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 5
playwright-cli -s=perf --raw eval "JSON.stringify(performance.timing)"
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=perf close' -WindowStyle Hidden -Wait
```

Key metrics to track:
- `navigationStart` to `loadEventEnd` (total load time)
- `domContentLoadedEventEnd` (DOM ready time)
- `responseEnd` (server response time)

### Expected Performance
- Join page load: < 3 seconds
- Game board load (after join): < 5 seconds
- Actor sheet open: < 2 seconds

## Known Issues & Warnings

1. **Screen Resolution Warning**
   - Message: "Foundry Virtual Tabletop requires a screen resolution of 1366px by 768px or greater"
   - Current: 1280px by 720px
   - Impact: Non-critical, features still work

2. **File Access**
   - Screenshots saved to working directory by default
   - Use full paths for specific locations: `--filename=C:\Users\Tuck\Documents\screenshot.png`

## Deprecated: playwright-shim.psm1

The PowerShell shim module is no longer needed. The `Start-Process -WindowStyle Hidden` pattern with named persistent sessions replaces it entirely. Do not use `Start-Job` patterns - they are unreliable because the job runs in a separate runspace that may not share the same playwright-cli daemon.

## Troubleshooting

### "Ref eX not found in the current page snapshot"

**Cause**: Attempting to interact with elements using stale refs.

**Solution**: Capture a fresh snapshot to get current refs:
```powershell
playwright-cli -s=<SESSION> snapshot
```

### Shell appears blocked/hung

**Cause**: `playwright-cli open` called as a standalone command instead of via `Start-Process`.

**Solution**: In a new terminal, run:
```powershell
playwright-cli close-all; playwright-cli kill-all
```
Then always use `Start-Process -WindowStyle Hidden` with named sessions going forward.

### "Browser is not open, please run open first"

**Cause**: Session was not started with `--persistent`, or the daemon process exited, or you're not targeting the right session name.

**Solution**: Ensure you use `--persistent` flag and correct session name:
```powershell
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','playwright-cli -s=<SESSION> open <URL> --persistent' -WindowStyle Hidden -PassThru
```
Also verify the session is active: `playwright-cli list`

### Session timeout or connection refused

**Cause**: FoundryVTT instance may be offline or URL changed.

**Solution**:
1. Verify the instance is running: `curl http://192.168.1.101:30000/`
2. Check network connectivity
3. Confirm URL hasn't changed

## Related Documentation

- AGENTS.md - Project-level agent instructions (contains Playwright best practices)
- playwright-shim.psm1 - DEPRECATED, do not use
- Microsoft Playwright CLI docs: https://skills.sh/microsoft/playwright-cli