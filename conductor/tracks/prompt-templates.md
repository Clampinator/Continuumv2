# Prompt Templates: Track Execution

## How to Use

Copy the appropriate template below, fill in the `[PLACEHOLDERS]`, and paste it as your first message in a new session. The agent will read the plan and execute only the tasks you specify.

**Key placeholders:**
- `[TRACK_ID]` - The track's directory name (e.g. `spanning_core_physics_20260428`)
- `[TRACK_NAME]` - Human-readable track name (e.g. `Spanning Core Physics`)
- `[TRACK_TYPE]` - One of: `refactor`, `feature`, `bugfix`, `audit`, `chore`

**Track IDs** (see `TRACKS.md` for current status):

| Track | ID | Type |
|-------|----|------|
| Experiences Management | `experiences_management_20260428` | feature |
| Eras Structural Refinement | `eras_structural_refinement_20260428` | feature |
| The Yet (Future Events) | `the_yet_implementation_20260428` | feature |
| Spanning Core Physics | `spanning_core_physics_20260428` | feature |
| Historical Span Insertion | `historical_span_insertion_20260428` | feature |
| Space-Time Map Integration | `spacetime_map_integration_20260428` | feature |
| Character Sheet Integration | `character_sheet_integration_20260428` | feature |
| UI/UX Fidelity Audit | `ui_ux_fidelity_audit_20260428` | chore |
| Era Navigation & Drag Bar | `era_navigation_bar_20260428` | feature |
| Trinity Purity Audit | `trinity_purity_audit_20260507` | refactor |

---

## Template A: Single Phase

Use when you want to tackle one full phase at a time.

```
You are executing the [TRACK_NAME] track for the Continuum V2 Foundry VTT system.

READ THESE FILES FIRST (in order):
1. conductor/tracks/[TRACK_ID]/spec.md
2. conductor/tracks/[TRACK_ID]/plan.md
3. AGENTS.md (sections: Trinity Architecture, Code Style, Testing Policy, Reminders)
4. REBUILD_MANDATE.md

YOUR ASSIGNMENT: Phase [NUMBER] ([PHASE NAME])

Execute ONLY the tasks in this phase. Do not touch other phases.

RULES:
- State stores only. Kernel computes only. Projector renders only. TTL converts format only.
- Grid drawing (step sizes, axis labels) is EXEMPT - the UI owns that.
- Every new Kernel function gets a new file in modules/temporal-kernel/
- Every new State function gets a new file in modules/state/
- Follow Function-Per-File (150 line max). Named exports only. .js extension in imports.
- Absolute pathing: /systems/continuum-v2/modules/... for all imports.
- Write tests FIRST (TDD Red phase). Tests go in tests/ matching the module path.
- Every task must have boundary-trace tests per AGENTS.md Testing Policy.
- Run `npm test` after completing each task. Fix failures before moving on.
- After all tasks in this phase pass tests, update plan.md: change [ ] to [x] for completed tasks.

FOR EACH TASK:
1. Read the relevant source file(s) completely
2. Understand the current behavior and what needs to change
3. Implement the change (new file, modification, or extraction)
4. Write tests for the new/changed behavior (Red phase)
5. Run tests - confirm they fail before implementation
6. Complete the implementation
7. Run tests - confirm they pass
8. Update plan.md task checkbox when done

STARTING TASK: [TASK NUMBER] (e.g. "1.1")

After completing all tasks in this phase, report:
- Which tasks completed
- Which tasks had complications (and what they were)
- New files created
- Modified files
- Test results
- Steps the user can take to validate the work and check for regressions
```

---

## Template B: Task Range (Multiple Tasks Within a Phase)

Use when you want a specific subset of tasks, not a full phase.

```
You are executing the [TRACK_NAME] track for the Continuum V2 Foundry VTT system.

READ THESE FILES FIRST (in order):
1. conductor/tracks/[TRACK_ID]/spec.md
2. conductor/tracks/[TRACK_ID]/plan.md
3. AGENTS.md (sections: Trinity Architecture, Code Style, Testing Policy, Reminders)
4. REBUILD_MANDATE.md

YOUR ASSIGNMENT: Tasks [START] through [END] (e.g. "2.1 through 2.5")

Execute ONLY these tasks. Do not touch other tasks in this phase or other phases.

RULES:
- State stores only. Kernel computes only. Projector renders only. TTL converts format only.
- Grid drawing (step sizes, axis labels) is EXEMPT - the UI owns that.
- Every new Kernel function gets a new file in modules/temporal-kernel/
- Every new State function gets a new file in modules/state/
- Follow Function-Per-File (150 line max). Named exports only. .js extension in imports.
- Absolute pathing: /systems/continuum-v2/modules/... for all imports.
- Write tests FIRST (TDD Red phase). Tests go in tests/ matching the module path.
- Every task must have boundary-trace tests per AGENTS.md Testing Policy.
- Run `npm test` after completing each task. Fix failures before moving on.
- After all specified tasks pass tests, update plan.md: change [ ] to [x] for completed tasks.

FOR EACH TASK:
1. Read the relevant source file(s) completely
2. Understand the current behavior and what needs to change
3. Implement the change (new file, modification, or extraction)
4. Write tests for the new/changed behavior (Red phase)
5. Run tests - confirm they fail before implementation
6. Complete the implementation
7. Run tests - confirm they pass
8. Update plan.md task checkbox when done

After completing all specified tasks, report:
- Which tasks completed
- Which tasks had complications (and what they were)
- New files created
- Modified files
- Test results
- Steps the user can take to validate the work and check for regressions
```

---

## Template C: Single Task (Precision Strike)

Use when you want exactly one task done with maximum focus.

```
You are executing the [TRACK_NAME] track for the Continuum V2 Foundry VTT system.

READ THESE FILES FIRST (in order):
1. conductor/tracks/[TRACK_ID]/spec.md
2. conductor/tracks/[TRACK_ID]/plan.md - Read ONLY Task [NUMBER]
3. AGENTS.md (sections: Trinity Architecture, Code Style, Testing Policy)
4. REBUILD_MANDATE.md

YOUR ASSIGNMENT: Task [NUMBER] ONLY

RULES:
- State stores only. Kernel computes only. Projector renders only. TTL converts format only.
- Grid drawing is EXEMPT.
- Function-Per-File (150 line max). Named exports only.
- Absolute pathing: /systems/continuum-v2/modules/...
- Write tests FIRST (TDD Red phase).
- Boundary-trace tests per AGENTS.md Testing Policy.
- Run `npm test` after completion. Fix failures.
- Update plan.md task checkbox when done.

EXECUTION:
1. Read the file(s) listed in the task completely
2. Understand the current behavior and what needs to change
3. Implement the change specified in the plan
4. Write boundary-trace tests for the change (Red phase)
5. Run tests - confirm they fail
6. Complete the implementation
7. Run tests - confirm they pass
8. Update plan.md: change [ ] to [x] for this task

When done, report: files created, files modified, test results, any complications.
```

---

## Template D: Bug Fix / Hotfix

Use when a bug or regression needs immediate fixing, outside of a track structure.

```
You are fixing a bug in the Continuum V2 Foundry VTT system.

BUG DESCRIPTION: [Describe the bug clearly - what happens, what should happen instead]

AFFECTED AREA: [e.g. "span-graph interaction", "era computation", "TTL conversion"]

READ THESE FILES FIRST:
1. AGENTS.md (sections: Trinity Architecture, Code Style, Testing Policy)
2. REBUILD_MANDATE.md
3. ISSUES.md (check for related known issues)

RULES:
- State stores only. Kernel computes only. Projector renders only. TTL converts format only.
- Do not add workarounds or patches. Fix the root cause in the correct layer.
- If the fix belongs in Kernel, it goes in modules/temporal-kernel/
- If the fix belongs in State, it goes in modules/state/
- If the fix belongs in Projector, it goes in modules/span-graph/renderers/
- Follow Function-Per-File (150 line max). Named exports only. .js extension in imports.
- Absolute pathing: /systems/continuum-v2/modules/... for all imports.
- Add a regression test that would have caught this bug.
- Boundary-trace tests per AGENTS.md Testing Policy if the fix crosses layer boundaries.
- Run `npm test` after the fix. All tests must pass.

EXECUTION:
1. Identify the layer where the bug originates (State, Kernel, Projector, or TTL)
2. Find the root cause - the exact function and line
3. Write a failing test that reproduces the bug (Red phase)
4. Fix the root cause
5. Run tests - confirm the regression test passes and no existing tests break
6. Update ISSUES.md: change status to [resolved] and add resolution details
7. Briefly explain what was wrong and how it was fixed

When done, report: root cause, fix applied, regression test location, test results.
```

---

## Template E: Full Track Implementation

Use when you want to execute an entire track from start to finish, phase by phase.

```
You are executing the [TRACK_NAME] track for the Continuum V2 Foundry VTT system.

READ THESE FILES FIRST (in order):
1. conductor/tracks/[TRACK_ID]/spec.md
2. conductor/tracks/[TRACK_ID]/plan.md
3. AGENTS.md (sections: Trinity Architecture, Code Style, Testing Policy, Reminders)
4. REBUILD_MANDATE.md

YOUR ASSIGNMENT: ALL phases of the [TRACK_NAME] track

Execute each phase in order. Complete all tasks in a phase before moving to the next.

RULES:
- State stores only. Kernel computes only. Projector renders only. TTL converts format only.
- Grid drawing (step sizes, axis labels) is EXEMPT - the UI owns that.
- Every new Kernel function gets a new file in modules/temporal-kernel/
- Every new State function gets a new file in modules/state/
- Follow Function-Per-File (150 line max). Named exports only. .js extension in imports.
- Absolute pathing: /systems/continuum-v2/modules/... for all imports.
- Write tests FIRST (TDD Red phase). Tests go in tests/ matching the module path.
- Every task must have boundary-trace tests per AGENTS.md Testing Policy.
- Run `npm test` after completing each task. Fix failures before moving on.
- After all tasks in a phase pass tests, update plan.md: change [ ] to [x] for completed tasks.
- STOP after completing each phase and report progress before continuing to the next.

FOR EACH TASK:
1. Read the relevant source file(s) completely
2. Understand the current behavior and what needs to change
3. Implement the change (new file, modification, or extraction)
4. Write tests for the new/changed behavior (Red phase)
5. Run tests - confirm they fail before implementation
6. Complete the implementation
7. Run tests - confirm they pass
8. Update plan.md task checkbox when done

After each phase, report:
- Which tasks completed
- Which tasks had complications (and what they were)
- New files created
- Modified files
- Test results
- Steps the user can take to validate the work and check for regressions
- Whether to proceed to the next phase
```

---

## Template F: Review & Audit (Read-Only)

Use when you want the agent to analyze code without making changes. Useful for pre-implementation analysis, architecture review, or identifying violations.

```
You are reviewing the [TRACK_NAME] area of the Continuum V2 Foundry VTT system.

REVIEW SCOPE: [e.g. "Trinity layer violations in span-graph", "Era data flow from State through Kernel to Projector"]

READ THESE FILES FIRST:
1. conductor/tracks/[TRACK_ID]/spec.md
2. conductor/tracks/[TRACK_ID]/plan.md
3. AGENTS.md (sections: Trinity Architecture, Code Style, Reminders)
4. REBUILD_MANDATE.md

YOUR ASSIGNMENT: READ-ONLY review. Do NOT modify any files.

INVESTIGATE:
1. Read all relevant source files in the review scope
2. Trace the data flow from user input through all layers
3. Identify violations of Trinity separation (State/Kernel/Projector cross-contamination)
4. Identify violations of Function-Per-File (files over 150 lines)
5. Identify missing boundary-trace tests
6. Identify property naming inconsistencies (Facts vs Physics mixing)
7. Note any legacy code that should have been migrated to the new module structure

REPORT FORMAT:
- Layer violations: [file:line] -> what belongs where
- Oversized files: [file] -> current line count, what should be extracted
- Missing tests: [function] -> what boundary paths are untested
- Property contamination: [file:line] -> which property mixes Facts and Physics
- Legacy code: [file] -> what module it should live in
- Recommended task breakdown for fixing each finding
```

---

## Filled Examples

### Example: Phase 2 of Spanning Core Physics
```
You are executing the Spanning Core Physics track for the Continuum V2 Foundry VTT system.

READ THESE FILES FIRST (in order):
1. conductor/tracks/spanning_core_physics_20260428/spec.md
2. conductor/tracks/spanning_core_physics_20260428/plan.md
3. AGENTS.md (sections: Trinity Architecture, Code Style, Testing Policy, Reminders)
4. REBUILD_MANDATE.md

YOUR ASSIGNMENT: Phase 2 (Interaction Logic)
STARTING TASK: 2.1
```

### Example: Tasks 1.2 through 1.4 of Era Navigation Bar
```
YOUR ASSIGNMENT: Tasks 1.2 through 1.4
```

### Example: Single Task - Historical Span Insertion 2.3
```
YOUR ASSIGNMENT: Task 2.3 ONLY
```

### Example: Bug Fix - Span Snapback on Save
```
BUG DESCRIPTION: After saving a span, the NOW node snaps back to the pre-span rail position instead of persisting at the arrival point.

AFFECTED AREA: span-graph interaction, temporal-engine pipeline
```

### Example: Full Track - Era Navigation & Drag Bar
```
You are executing the Era Navigation & Drag Bar track for the Continuum V2 Foundry VTT system.

YOUR ASSIGNMENT: ALL phases of the Era Navigation & Drag Bar track
```

### Example: Review - Trinity Purity in span-graph renderers
```
You are reviewing the Span Graph renderers in the Continuum V2 Foundry VTT system.

REVIEW SCOPE: Trinity layer violations in span-graph/renderers/ - any renderer that performs domain logic instead of dumb pixel projection

YOUR ASSIGNMENT: READ-ONLY review. Do NOT modify any files.
```