# Vehicle Combat Module - Step-by-Step Implementation Specification

## Module Identity

- **Name:** Vehicle Combat
- **Code Path:** `modules/vehicle-combat/`
- **Dependency:** Continuum V2 core (attributes, combat system, MitigationEngine, DefenderProfile)
- **Sister Module:** Continuum Combat Tracker (CCT) - this module mirrors its structure
- **Integration Points:** Lifeline (character data), Action Points (roll AP), Foundry tokens/scenes
- **Architecture:** Trinity (State / Kernel / Projector) - MANDATORY

---

## Architectural Constitution

This module follows the REBUILD MANDATE without exception:

1. **DATABASE IS AUTHORITY.** All vehicle combat state lives on Foundry's Combat document flags, same as CCT. The UI is a dumb projector that renders flag data into pixels. No UI state is ever written directly.
2. **THE TRINITY.** Three non-overlapping layers:
   - **STATE** (`modules/vehicle-combat/state/`) - Reads/writes combat flags, handles atomic mutations
   - **KERNEL** (`modules/vehicle-combat/kernel/`) - Pure, stateless physics and rules functions
   - **PROJECTOR** (`modules/vehicle-combat/projector/`) - Dumb rendering, receives manifests, draws pixels
3. **FPF LAW.** Function-Per-File. No file exceeds 150 lines. Every rule, mutation, and renderer gets its own file.
4. **PROPERTY ISOLATION.** Facts (position data, system names) and Physics (delta-v, acceleration) never share property names.
5. **ABSOLUTE PATHING.** Use `/systems/continuum-v2/modules/...` for all imports.

The Kernel is the ONLY thing allowed to tell the State how to change.

---

## Core Combat Concepts

### Action Points and Phases: Identical Structure to CCT

Vehicle combat uses the **exact same round/phase/AP structure** as the Continuum Combat Tracker:

- **4 phases per round** (same as CCT's 4 phases)
- **AP roll at round start** using the character's attribute (same `rollAP` call)
- **1 action per phase** chosen from 4 action types (same 2x2 grid)
- **Defer is free, all other actions cost 1 AP** (same AP spend logic)
- **Phase advancement** controlled by GM via Next Phase button (same as CCT)
- **State stored on Combat flag** (same flag pattern as `continuum-combat-tracker`)

### The Four Vehicle Action Types

These replace CCT's Defer/Flee/Defend/Fight. They map 1:1 to the same positions in the 2x2 grid:

| Position | CCT Action | Vehicle Action | Icon | Description |
|----------|-----------|----------------|------|-------------|
| Top-left | Defer | **Defer** | Clock | Free action. Yields the phase. No AP cost. Can only be used once per round. |
| Top-right | Flee | **Detect** | Satellite dish | EW/sensor action. Sweep, jam, stealth, thermal scan. Costs 1 AP. |
| Bottom-left | Defend | **Repair** | Wrench | Engineering/medical action. Repair systems, route power, treat crew, cool systems. Costs 1 AP. |
| Bottom-right | Fight | **Operate** | Steering wheel | Piloting and gunnery. Navigate (destination+time), fire weapons, deploy mines/chaff. Costs 1 AP. |

### What Each Action Does Per Phase

**Defer (Free):**
- Yields the phase. No action taken.
- Can only be declared once per round across all 4 phases.
- If no AP remains, Defer is the only available action.

**Detect (1 AP):**
- **Sensor Sweep:** Roll mind vs difficulty to detect hidden mines, ships in shadow, debris density
- **Jam Target:** Apply targeting penalty to a specific enemy vessel
- **Stealth Mode:** Switch to passive sensors (reduces own signature, no active ping)
- **Thermal Scan:** Switch to thermal detection mode (sees through partial shadow, only detects burning ships)
- **Identify Contact:** Determine class, armament, system status of a detected contact

**Repair (1 AP):**
- **Repair System:** Engineer mind roll to restore system function/structureIp
- **Route Power:** Boost one system at another's expense (shift function points)
- **Cool Systems:** Reduce heat on a specific system
- **Arm Mines:** Prepare ordnance for deployment (1-round arm delay)
- **Treat Crew:** Medic eq roll to reduce wound IP on a crew member
- **Stabilize Crew:** Stop bleeding on a wounded crew member

**Operate (1 AP):**
- **Navigate:** Declare destination + time (or drift). Kernel shows preview, player confirms
- **Fire Weapon:** Roll attack vs target ship, apply damage to system block
- **Deploy Mine:** Place a mine at current position or jettisoned along velocity vector
- **Deploy Chaff:** Create sensor-degrading cloud at current position
- **Deploy Flare:** Create IR decoy
- **Dump Debris:** Release cargo mass as kinetic hazard cloud

### The Operate Detail: Navigate

When a player chooses Operate with a navigation intent:

1. Player clicks destination on the 3D scene (or on sensors view)
2. Player drags a time slider or types seconds
3. Player checks/unchecks "Waypoint" (no deceleration) vs "Full Stop"
4. **Kernel computes the full solution** and returns a preview:
   - Trajectory line (orange=burn, blue=coast, green=decel)
   - Fuel cost, propellant remaining
   - Peak G-force, crew stress
   - Gravity delta-v component
   - Denial volume intersections (debris, shells, mines)
   - Sensor shadow annotations
5. **Player reviews preview card** and confirms or adjusts
6. On confirm: 1 AP deducted, state updated

If the pilot takes no Operate action in a phase, the ship **drifts** on its current velocity vector, curved by gravity.

### The Operate Detail: Fire Weapon

When a player chooses Operate with a weapon intent:

1. Player selects weapon and target ship
2. Player selects aimed system block on target (or random via hit location)
3. **Kernel resolves attack:**
   - Firing arc check
   - Sensor shadow penalty (is target in shadow from attacker's position?)
   - Attack roll: crew attribute + weapon bonus - range penalty - sensor penalty - jamming
   - Hit location (d10 maps to vehicle system, same as personal combat maps to body parts)
   - Damage resolution via MitigationEngine (structureIp replaces body armor IP)
   - System degradation if damage exceeds thresholds
   - Cascade check if any system hits 0 structureIp
4. On hit: damage applied to target, armor degraded if applicable

---

## Step 1: State Layer - Combat Flags

### 1.1 Vehicle Combat State (on Combat Flag)

**File:** `modules/vehicle-combat/state/state-manager.js`

Mirrors CCT's `state-manager.js` exactly. Same pattern: `getCombatState()`, `_setCombatState()`, `initializeCombatState()`, `advancePhase()`, `setCombatantAp()`, `logAction()`.

```js
// Stored on: game.combat.setFlag('vehicle-combat', 'state', {...})
{
  isActive: true,
  currentRound: 1,
  currentPhase: 1,           // 1-4, same as CCT
  combatants: {
    [actorId]: {
      id: actorId,
      actions: {},             // { 1: 'defer', 2: 'detect', 3: 'repair', 4: 'operate' }
      ap: null,
      remainingAp: null,
      rolledAttribute: null,
      // Vehicle combat additions:
      vehicleId: null,         // which vehicle this crew is assigned to
      station: null,          // pilot | gunner | engineer | ew | medic
      navigationSolution: null // stored after Operate::navigate is confirmed
    }
  },
  // Vehicle combat scene-level state:
  scene: {
    gravitySources: [],
    debrisClouds: [],
    mines: [],
    lagrangePoints: []
  }
}
```

### 1.2 State Mutation Functions

Mirrors CCT's state-manager function signatures. Each writes to the combat flag and emits socket events.

| File | Function | Mirrors CCT |
|------|----------|------------|
| `state/state-manager.js` | `getCombatState()` | Yes - returns deep clone of flag |
| `state/state-manager.js` | `_setCombatState(newState)` | Yes - writes flag + socket emit |
| `state/state-manager.js` | `initializeCombatState()` | Yes - creates initial state |
| `state/state-manager.js` | `advancePhase()` | Yes - phase++ or round++ with reset |
| `state/state-manager.js` | `setCombatantAp(actorId, ap)` | Yes - sets AP + resets actions |
| `state/state-manager.js` | `setCombatantRolledAttribute(actorId, attr)` | Yes |
| `state/state-manager.js` | `logAction(actorId, phase, action)` | Yes - logs action + recalculates remaining AP |
| `state/state-manager.js` | `addCombatantToState(actorId)` | Yes - adds new combatant to state |

Vehicle-specific additions to state-manager (new functions, same file pattern):

| File | Function | Purpose |
|------|----------|---------|
| `state/update-vehicle-position.js` | `updateVehiclePosition(vehicleId, pos, vel)` | Writes position/velocity to scene flag |
| `state/update-vehicle-system.js` | `updateVehicleSystem(vehicleId, systemKey, updates)` | Writes system block changes |
| `state/update-vehicle-propellant.js` | `updateVehiclePropellant(vehicleId, current)` | Writes fuel level |
| `state/update-vehicle-heat.js` | `updateVehicleHeat(vehicleId, current)` | Writes heat level |
| `state/create-debris-cloud.js` | `createDebrisCloud(cloudData)` | Adds debris cloud to scene flag |
| `state/update-debris-cloud.js` | `updateDebrisCloud(cloudId, updates)` | Updates cloud decay/density |
| `state/create-mine.js` | `createMine(mineData)` | Adds mine to scene flag |
| `state/remove-mine.js` | `removeMine(mineId)` | Removes detonated/expired mine |

---

## Step 2: Kernel Layer - Pure Physics Functions

Every kernel function is **pure, stateless, testable.** Input in, output out. No side effects, no DB writes. This is the same principle as CCT's `calculateApResult` and `evaluateDiceRoll` - pure math.

### 2.1 Navigation Kernel

| # | File | Signature | Returns |
|---|------|-----------|---------|
| 2.1.1 | `kernel/calculate-navigation-solution.js` | `(vehicle, destination, time, fullStop, scene) => solution` | Full cost preview with denial/shadow intersections, trajectory |
| 2.1.2 | `kernel/calculate-brachistochrone.js` | `(distance, time, fullStop) => { acceleration, deltaV, phases[] }` | Burn schedule |
| 2.1.3 | `kernel/calculate-waypoint-velocity.js` | `(acceleration, time) => arrivalVelocity` | Flyby speed |
| 2.1.4 | `kernel/calculate-gravity-cost.js` | `(positionA, positionB, gravitySources) => gravityDeltaV` | Gravity delta-v |
| 2.1.5 | `kernel/calculate-hill-sphere.js` | `(bodyMass, primaryMass, semiMajorAxis) => radius` | Influence zone radius |
| 2.1.6 | `kernel/calculate-lagrange-positions.js` | `(gravitySources[]) => lagrangePoints[]` | L1-L5 positions |
| 2.1.7 | `kernel/calculate-gravity-gradient.js` | `(position, gravitySources) => { vector, magnitude, dominantBody }` | Net gravity at point |
| 2.1.8 | `kernel/calculate-drift-trajectory.js` | `(vehicle, gravitySources, timeHorizon) => trajectoryPoints[]` | Keplerian orbit path |
| 2.1.9 | `kernel/calculate-3d-distance.js` | `(posA, posB) => distance` | Euclidean 3D distance |
| 2.1.10 | `kernel/calculate-propellant-cost.js` | `(deltaV, mass, isp) => propellantUnits` | Delta-v to fuel |
| 2.1.11 | `kernel/validate-navigation-action.js` | `(vehicle, solution) => { valid, reasons[] }` | Feasibility |

### 2.2 Denial Kernel

| # | File | Signature | Returns |
|---|------|-----------|---------|
| 2.2.1 | `kernel/calculate-denial-intersection.js` | `(trajectory, denialVolumes[]) => intersections[]` | Entry/exit, density per volume |
| 2.2.2 | `kernel/calculate-debris-impact.js` | `(intersection, vehicle) => { probability, expectedIp, systemHits[] }` | Impact prediction |
| 2.2.3 | `kernel/calculate-velocity-matching-cost.js` | `(vehicle, shell) => deltaV` | Co-orbital transit cost |
| 2.2.4 | `kernel/calculate-mine-detonation.js` | `(trajectory, mines[], sensorFunction) => detonationProbability[]` | Mine hit probability |
| 2.2.5 | `kernel/calculate-kessler-cascade.js` | `(destroyedVehicle, satelliteShells[]) => { cascadeRisk, densityIncrease, gmWarning }` | Cascade risk (GM notified) |
| 2.2.6 | `kernel/calculate-cloud-dispersal.js` | `(cloud, roundsElapsed) => newDensity` | Cloud decay |
| 2.2.7 | `kernel/resolve-debris-impact.js` | `(vehicle, intersection) => { systemDamage[], crewDamage[] }` | Apply debris damage |
| 2.2.8 | `kernel/resolve-mine-damage.js` | `(vehicle, mine) => { systemDamage[], crewDamage[] }` | Apply mine damage |
| 2.2.9 | `kernel/validate-deploy-denial.js` | `(vehicle, denialType) => { valid, reasons[] }` | Check ordnance + system |

### 2.3 Sensor Shadow Kernel

| # | File | Signature | Returns |
|---|------|-----------|---------|
| 2.3.1 | `kernel/calculate-sensor-shadow.js` | `(sensorPosition, targetPosition, scene) => shadowResult` | Cumulative penalty, sources, effective function |
| 2.3.2 | `kernel/calculate-sensor-coverage.js` | `(vehicle, scene) => coverageVolume` | Detectable positions |
| 2.3.3 | `kernel/calculate-thermal-detection.js` | `(sensorPos, targetPos, targetBurning, scene) => detectionResult` | Thermal through shadow |
| 2.3.4 | `kernel/calculate-last-known-position.js` | `(sensorId, targetId, roundLog) => { position, timestamp }` | Last LOS position |

### 2.3.5 Sensor Shadow Effect Table

| Shadow Source | Density | Passive | Active (-2 shadow) | Thermal (-1 shadow) |
|---|---|---|---|---|
| Clear space | 0 | Full range | 2x range | N/A (coasting) |
| Chaff cloud | 0.6 | -2 to -3 | Full range | -1 to -2 |
| Debris cloud (low) | 0.3 | -1 | Full range | Full range |
| Debris cloud (high) | 0.9 | -4 to -6 | -2 to -4 | -3 to -5 |
| Satellite shell (thin) | 0.1-0.3 | -1 to -2 | Full range | -1 |
| Satellite shell (dense) | 0.7-1.0 | -4 to -8 | -2 to -6 | -3 to -7 |
| Planetary body | 1.0 | No detection | No detection | No detection |
| Ship hull (large) | 0.8 | -3 to -5 | -1 to -3 | -2 to -4 |

Active sensors burn through 2 levels of shadow but reveal position. Thermal reduces penalty by 1 but only detects burning (thrusting) ships.

### 2.4 Combat Kernel

| # | File | Signature | Returns |
|---|------|-----------|---------|
| 2.4.1 | `kernel/calculate-firing-arc.js` | `(vehicle, target, weaponArc) => inArc` | Arc check |
| 2.4.2 | `kernel/calculate-heat-generation.js` | `(thrust, weaponsFired, activeSystems[]) => heatGenerated` | Heat sum |
| 2.4.3 | `kernel/calculate-heat-consequences.js` | `(vehicle) => { penalty, shutdownSystems[] }` | Overheat |
| 2.4.4 | `kernel/calculate-g-stress.js` | `(acceleration, crew[]) => gStressResult[]` | Crew IP |
| 2.4.5 | `kernel/calculate-system-degradation.js` | `(system) => functionLoss` | StructureIp -> function |
| 2.4.6 | `kernel/calculate-system-cascades.js` | `(systems, destroyedKey) => cascadeDamage[]` | Adjacent damage |
| 2.4.7 | `kernel/resolve-vehicle-attack.js` | `(attacker, target, weapon) => attackResult` | Hit/damage/system |
| 2.4.8 | `kernel/resolve-vehicle-mitigation.js` | `(damage, armorIp, structureIp) => mitigationResult` | Extends MitigationEngine |
| 2.4.9 | `kernel/resolve-repair-action.js` | `(engineer, target, difficulty) => repairResult` | System restore |
| 2.4.10 | `kernel/resolve-crew-casualty.js` | `(crew, damageSource) => crewDamage[]` | Environmental IP |
| 2.4.11 | `kernel/resolve-sensor-sweep.js` | `(ewOfficer, range, scene) => detections[]` | Detect mines/ships |

### 2.5 Domain Kernel

| # | File | Signature | Returns |
|---|------|-----------|---------|
| 2.5.1 | `kernel/calculate-atmosphere-effects.js` | `(vehicle, altitude) => { drag, stallSpeed, structuralLimit, coolingModifier }` | Air |
| 2.5.2 | `kernel/calculate-water-effects.js` | `(vehicle, depth) => { drag, pressure, buoyancy, coolingModifier }` | Water |
| 2.5.3 | `kernel/calculate-terrain-effects.js` | `(vehicle, terrainType, grade) => { speedCap, fuelModifier, rolloverRisk }` | Land |

### 2.6 Static Data

| File | Purpose |
|------|---------|
| `kernel/vehicle-catalog.js` | SPACE_VEHICLE_DATA + expanded LAND/AIR/WATER with system blocks |
| `kernel/system-adjacency.js` | Cascade adjacency map for system blocks |
| `kernel/system-degradation-table.js` | StructureIp% -> function loss mapping |
| `kernel/sensor-shadow-table.js` | Shadow penalty values per source type and density |
| `kernel/vehicle-hit-location.js` | d10 -> vehicle system mapping (mirrors CCT's `map-hit-location.js`) |

### 2.7 Vehicle Hit Location Map

**File:** `kernel/vehicle-hit-location.js`

```js
// Mirrors the d10 -> body part mapping in CCT's map-hit-location.js
const VEHICLE_HIT_LOCATION = {
  1:  { code: 'A', system: 'bridge',      name: 'Bridge' },
  2:  { code: 'B', system: 'hullFore',     name: 'Forward Hull' },
  3:  { code: 'B', system: 'hullFore',     name: 'Forward Hull' },
  4:  { code: 'C', system: 'hullPort',     name: 'Port Hull' },
  5:  { code: 'D', system: 'magazine',     name: 'Magazine' },
  6:  { code: 'D', system: 'magazine',     name: 'Magazine' },
  7:  { code: 'F', system: 'sensors',      name: 'Sensors' },
  8:  { code: 'E', system: 'engines',      name: 'Engines' },
  9:  { code: 'E', system: 'engines',      name: 'Engines' },
  10: { code: 'G', system: 'hullAft',      name: 'Aft Hull' }
};
```

---

## Step 3: Projector Layer - Rendering and UI

### 3.1 GM Console (Mirrors CCT's gm-console.js)

**File:** `projector/gm-console.js`

Same Application subclass pattern as CCT. Same `getData()` structure pulling from `getCombatState()`. Same `activateListeners()` for next-phase and end-combat buttons. Same socket-driven re-render on state change.

**Template:** `templates/gm-console.html`

```html
<div class="vehicle-combat gm-console">
  {{#if combat.isActive}}
  <header class="console-header">
    <div class="header-info">
      <h2>Vehicle Combat Console</h2>
      <div class="combat-status">
        <span>Round: <strong>{{combat.currentRound}}</strong></span>
        <span>Phase: <strong>{{combat.currentPhase}}</strong></span>
      </div>
    </div>
    <div class="combat-controls">
      <button type="button" class="next-phase-btn">Next Phase</button>
      <button type="button" class="end-combat-btn">End Combat</button>
    </div>
  </header>

  <main class="console-main">
    <div class="combatant-column party-column">
      <h3>Friendly</h3>
      <div class="combatant-list">
        {{#each combat.party as |card|}}
          {{> "vehicle-combat.vehicleCard" card}}
        {{/each}}
      </div>
    </div>
    <div class="combatant-column enemy-column">
      <h3>Hostile</h3>
      <div class="combatant-list">
        {{#each combat.enemies as |card|}}
          {{> "vehicle-combat.vehicleCard" card}}
        {{/each}}
      </div>
    </div>
  </main>

  <footer class="console-footer">
    <h3>Phase Timeline</h3>
    <div class="phases-row">
      {{#each combat.phases}}
      <div class="phase-container {{#if this.isCurrent}}current-phase{{/if}}">
        <h5>{{this.label}}</h5>
        <div class="phase-actors">
          {{#each this.actors}}
          <div class="actor-token {{this.status}}" title="{{this.name}}">
            <img src="{{this.img}}" alt="{{this.name}}">
          </div>
          {{/each}}
        </div>
      </div>
      {{/each}}
    </div>
  </footer>
  {{else}}
  <div class="combat-inactive-message">
    <p>No active vehicle combat.</p>
  </div>
  {{/if}}
</div>
```

### 3.2 Vehicle Combat Card (Mirrors CCT's npc-combat-card.html)

**Template:** `templates/vehicle-card.html`

```html
<div class="vehicle-combat-card" data-actor-id="{{id}}">
  <!-- Header: Vehicle identity and crew attribute pills -->
  <div class="card-primary-row">
    <div class="vehicle-identity">
      <img class="vehicle-portrait" src="{{img}}" alt="{{name}}">
      <div class="vehicle-meta-text">
        <span class="vehicle-name">{{name}}</span>
        <span class="vehicle-class">{{vehicleClass}}</span>
      </div>
    </div>

    <!-- Attribute Pills (same pattern as CCT) -->
    <div class="vehicle-attr-pills">
      {{#each attributes as |attr|}}
      <button type="button" class="vehicle-roll-btn pill-{{attr.key}} {{#if attr.isRolled}}is-rolled{{/if}}"
              data-attribute="{{attr.key}}"
              data-tooltip="Roll {{attr.key}} Action Points (Effective TN: {{attr.tn}})">
        <span class="attr-label">{{attr.label}}</span>
        <span class="attr-tn">{{attr.tn}}</span>
      </button>
      {{/each}}
    </div>

    <div class="vehicle-ap-readout">
      <span class="ap-value">{{#if (ne ap null)}}{{ap}}{{else}}--{{/if}}</span>
    </div>
  </div>

  <!-- Vehicle system status bar -->
  <div class="card-systems-row">
    {{#each systems as |sys|}}
    <div class="system-block {{sys.statusClass}}" data-tooltip="{{sys.name}}: {{sys.structureIp}}/{{sys.maxStructureIp}} Str, {{sys.function}}/{{sys.maxFunction}} Fn">
      <span class="system-label">{{sys.shortName}}</span>
      <div class="system-bar">
        <div class="system-fill" style="width: {{sys.functionPct}}%"></div>
      </div>
    </div>
    {{/each}}
  </div>

  <!-- Phase Controls: 2x2 grid (mirrors CCT's action-grid) -->
  <div class="card-secondary-row">
    <div class="phase-control-container">
      {{#each phases as |p|}}
      <div class="phase-box {{p.mode}}" data-phase-index="{{p.index}}">
        {{#if p.isActive}}
          <div class="action-grid">
            {{#if p.deferAvailable}}
            <i class="fas fa-clock vehicle-declare-btn" data-action="defer" data-tooltip="Defer"></i>
            {{else}}
            <i class="fas fa-clock vehicle-declare-btn disabled" data-tooltip="Defer (Used)"></i>
            {{/if}}
            <i class="fas fa-satellite-dish vehicle-declare-btn" data-action="detect" data-tooltip="Detect"></i>
            <i class="fas fa-wrench vehicle-declare-btn" data-action="repair" data-tooltip="Repair"></i>
            <i class="fas fa-steering-wheel vehicle-declare-btn" data-action="operate" data-tooltip="Operate"></i>
          </div>
        {{else if (or p.isLocked p.isHistorical)}}
          <div class="locked-action">
            {{#if (eq p.chosenIcon "defer")}}<i class="fas fa-clock" data-tooltip="Defer"></i>{{/if}}
            {{#if (eq p.chosenIcon "detect")}}<i class="fas fa-satellite-dish" data-tooltip="Detect"></i>{{/if}}
            {{#if (eq p.chosenIcon "repair")}}<i class="fas fa-wrench" data-tooltip="Repair"></i>{{/if}}
            {{#if (eq p.chosenIcon "operate")}}<i class="fas fa-steering-wheel" data-tooltip="Operate"></i>{{/if}}
          </div>
        {{else}}
          <span class="phase-num">{{p.index}}</span>
        {{/if}}
      </div>
      {{/each}}
    </div>
  </div>
</div>
```

### 3.3 Phase Labels

| Phase | CCT Label | Vehicle Label | Description |
|-------|-----------|--------------|-------------|
| Phase 1 | Phase 1 | **Defer Phase** | Fastest actions. Defer declarations. Initiative establishment. |
| Phase 2 | Phase 2 | **Detect Phase** | EW and sensor actions resolve. Intelligence gathering. |
| Phase 3 | Phase 3 | **Repair Phase** | Engineering and medical actions resolve. Damage control. |
| Phase 4 | Phase 4 | **Operate Phase** | Piloting and gunnery resolve. Movement and firepower. |

Actions from faster phases execute before slower phases in the same round. This creates a natural tactical ordering: detect before you shoot, repair before you maneuver.

### 3.4 Module Files (Mirrors CCT's modules/)

| CCT File | Vehicle File | Purpose |
|----------|-------------|---------|
| `modules/render-npc-card.js` | `modules/render-vehicle-card.js` | Inject card into combat tracker sidebar |
| `modules/attach-listeners.js` | `modules/attach-listeners.js` | Delegated event listeners for card interactions |
| `modules/declare-action.js` | `modules/declare-action.js` | Handle Defer/Detect/Repair/Operate button clicks |
| `modules/get-phase-visuals.js` | `modules/get-phase-visuals.js` | Determine active/locked/historical/inactive for each phase box |
| `modules/get-combatant-card-data.js` | `modules/get-vehicle-card-data.js` | Transform combatant + vehicle data into template context |
| `modules/inject-phase-controls.js` | `modules/inject-phase-controls.js` | Inject phase tracker into sidebar header |
| `modules/trigger-attribute-roll.js` | `modules/trigger-attribute-roll.js` | Trigger AP roll via system-api.rollAP |

### 3.5 Combat-UI Injection (Mirrors CCT's character-sheet integration)

**File:** `projector/character-sheet-integration.js`

Same pattern as CCT's `character-sheet-integration.js`: injects the phase action grid into the character sheet's combat tracker injection point when vehicle combat is active.

**Template:** `templates/combat-ui.html`

Same 4-phase grid structure but with Det/Rep/Oper action buttons instead of Fight/Flee/Def.

### 3.6 Pixi3D Projector Functions

These are the 3D rendering layer. They receive a manifest and draw. No domain logic.

| # | File | Draws |
|---|------|-------|
| 3.6.1 | `projector/foundry-app-shell.js` | ApplicationV2 subclass hosting Pixi3D canvas |
| 3.6.2 | `projector/tactical-scene-renderer.js` | Camera, lights, star field |
| 3.6.3 | `projector/ship-model-renderer.js` | glTF ship models at positions, damage colors |
| 3.6.4 | `projector/engine-glow-renderer.js` | Emissive engines during thrust |
| 3.6.5 | `projector/velocity-vector-renderer.js` | 3D heading/velocity arrows |
| 3.6.6 | `projector/trajectory-preview-renderer.js` | Navigate intent line (orange/blue/green) |
| 3.6.7 | `projector/drift-line-renderer.js` | Dashed gravity-curved drift path |
| 3.6.8 | `projector/weapon-arc-renderer.js` | Firing cone meshes |
| 3.6.9 | `projector/weapon-fire-renderer.js` | Projectile/beam sprites |
| 3.6.10 | `projector/explosion-renderer.js` | Impact burst |
| 3.6.11 | `projector/explosion-debris-renderer.js` | Destruction -> persistent debris cloud |
| 3.6.12 | `projector/sensor-cone-renderer.js` | Detection volume |
| 3.6.13 | `projector/shadow-volume-renderer.js` | Darkened blocked regions |
| 3.6.14 | `projector/contact-marker-renderer.js` | "?" for undetected ships |
| 3.6.15 | `projector/sensor-sweep-renderer.js` | Animated pulse |
| 3.6.16 | `projector/thermal-signature-renderer.js` | Glow on burning ships |
| 3.6.17 | `projector/gravity-well-renderer.js` | Planet/moon + Hill sphere wireframe |
| 3.6.18 | `projector/lagrange-point-renderer.js` | L-point diamond markers |
| 3.6.19 | `projector/satellite-shell-renderer.js` | Orbital debris band |
| 3.6.20 | `projector/debris-cloud-renderer.js` | Particle cluster |
| 3.6.21 | `projector/minefield-renderer.js` | Detected mines + radius circles |
| 3.6.22 | `projector/chaff-cloud-renderer.js` | Shimmering metallic volume |
| 3.6.23 | `projector/denial-overlay-renderer.js` | Red trajectory denial segments |
| 3.6.24 | `projector/kessler-warning-renderer.js` | GM cascade risk overlay |
| 3.6.25 | `projector/atmosphere-shell-renderer.js` | Planet atmosphere boundary |
| 3.6.26 | `projector/terrain-mesh-renderer.js` | Land ground + elevation |
| 3.6.27 | `projector/water-surface-renderer.js` | Semi-transparent water plane |
| 3.6.28 | `projector/damage-flash-renderer.js` | System block flash animation |
| 3.6.29 | `projector/selection-ring-renderer.js` | Torus under selected ship |
| 3.6.30 | `projector/hud-overlay-renderer.js` | 2D PixiJS layer: crew cards, cost preview, system status |
| 3.6.31 | `projector/sensors-view-renderer.js` | Top-down orthographic toggle |
| 3.6.32 | `projector/generate-vehicle-manifest.js` | State -> manifest transform |
| 3.6.33 | `projector/input-handler.js` | 3D mesh picking -> kernel input |

---

## Step 4: Bridge Module - Foundry Integration

| # | File | Mirrors CCT | Purpose |
|---|------|------------|---------|
| 4.1 | `bridge/combat-controller.js` | `combat-controller.js` | Creates combat, adds tokens, initializes state, opens GM console |
| 4.2 | `bridge/main.js` | `main.js` | Module init, API registration, socket listener, template preload, hooks |
| 4.3 | `bridge/round-resolver.js` | N/A (new) | Resolves declared actions per phase: Detect -> Repair -> Operate |
| 4.4 | `bridge/token-sync.js` | N/A (new) | Sync Foundry token positions to 3D scene and back |
| 4.5 | `bridge/combat-socket.js` | Socket in `main.js` | Vehicle combat specific socket events |
| 4.6 | `bridge/ap-roller.js` | `trigger-attribute-roll.js` | Wraps system-api.rollAP for crew stations |

---

## Step 5: Round Resolution Flow

### Phase 1: Defer Phase

All combatants who declared **Defer** in this phase have their action logged (free, no AP cost). This is also when AP rolls happen if they haven't been rolled yet this round.

```
FOR each combatant IN combat:
  IF combatant has NOT rolled AP this round:
    Display AP roll buttons (same as CCT: Force/Analyze/Relate/Move for characters)
    Wait for roll
    SET combatant.ap and combatant.remainingAp
  END IF
END FOR
```

### Phase 2: Detect Phase

All combatants who declared **Detect** resolve their EW actions.

```
FOR each combatant IN initiativeOrder WHO declared 'detect' in phase 2:
  DEDUCT 1 AP
  Player chooses specific Detect action:
    SENSOR SWEEP: resolve-sensor-sweep -> detections[]
    JAM: apply targeting penalty to target
    STEALTH: switch to passive mode
    THERMAL: switch to thermal mode
    IDENTIFY: determine target details
END FOR
```

### Phase 3: Repair Phase

All combatants who declared **Repair** resolve their engineering/medical actions.

```
FOR each combatant IN initiativeOrder WHO declared 'repair' in phase 3:
  DEDUCT 1 AP
  Player chooses specific Repair action:
    REPAIR SYSTEM: resolve-repair-action -> restore function/structureIp
    ROUTE POWER: shift function between systems
    COOL SYSTEMS: reduce heat
    ARM MINES: prepare ordnance
    TREAT CREW: eq roll to reduce wound IP
    STABILIZE: stop bleeding
END FOR
```

### Phase 4: Operate Phase

All combatants who declared **Operate** resolve their piloting/gunnery actions.

```
FOR each combatant IN initiativeOrder WHO declared 'operate' in phase 4:
  DEDUCT 1 AP
  Player chooses specific Operate action:
    NAVIGATE:
      Show destination + time UI
      Kernel computes preview
      Player confirms -> update position, velocity, propellant, heat, crew G-stress
      Check denial intersections -> resolve debris impact or mine detonation
    FIRE WEAPON:
      Select weapon + target + aimed system
      Kernel resolves attack (arc, shadow, roll, damage, cascade)
    DEPLOY MINE: validate + create mine
    DEPLOY CHAFF: validate + create chaff cloud
    DEPLOY FLARE: validate + create IR decoy
    DUMP DEBRIS: validate + create debris cloud
END FOR

// After all Operate actions resolve:
// Environment phase (automatic, not player-declared)
FOR each vehicle:
  IF no navigation action this round: drift
  Apply gravity, domain effects
END FOR
FOR each debris cloud: decay density
FOR each mine: tick lifespan
FOR each vehicle: accumulate heat, apply cooling
CHECK destroyed ships: generate debris, kessler cascade risk (GM notification)
```

---

## Step 6: Integration with Existing Combat System

### 6.1 Identical AP System

Vehicle combat uses `game.system.api.rollAP()` exactly as CCT does:

```js
// From trigger-attribute-roll.js (mirrors CCT)
export async function triggerAttributeRoll(event, actorId) {
    const actor = game.actors.get(actorId);
    const attribute = event.currentTarget.dataset.attribute;
    if (game.user.isGM) {
        await setCombatantRolledAttribute(actorId, attribute);
    }
    if (game.system.api?.rollAP) {
        await game.system.api.rollAP({ actor, attribute });
    }
}
```

### 6.2 Identical AP Cost Logic

Same as CCT's `logAction`:

```js
// 'defer' is the only free action
// 'detect', 'repair', 'operate' each cost 1 AP
const totalSpentAp = allActions.filter(a => a !== 'defer').length;
newRemainingAp = totalAp - totalSpentAp;
```

### 6.3 Identical Phase Visuals

Same `getPhaseVisuals` logic, same mode strings (`active`, `locked`, `historical`, `inactive`), same `chosenIcon` pattern.

### 6.4 MitigationEngine Integration

Vehicle system damage uses the **same MitigationEngine** as personal combat:

```js
const mitigation = MitigationEngine.calculateMitigation(weaponDamage, targetSystem.structureIp);
// armor >= damage + 3: no damage passes
// armor >= damage: 1 bruise IP passes, armor degrades
// armor < damage: damage - armor passes, armor degrades
```

### 6.5 Crew Wounds Use Existing System

Crew IP from G-stress, decompression, heat uses `DefenderProfile.applyWounds` on the crew member's character sheet. Same wound slots, same bleeding mechanics.

### 6.6 Benefits Apply Identically

- **Sharp Reflexes** (+2 React for AP): applies to pilot/gunner AP rolls
- **Tough** (1 less bruise IP): applies to crew G-stress IP
- **Perceptive** (+2 Analyze for perception): applies to EW sensor sweep rolls

---

## Step 7: Testing Strategy

### 7.1 Boundary-Trace Tests (Mandatory)

Every kernel function that transforms data across a boundary MUST have tests verifying all valid input paths.

**Specific requirements:**

1. Every `calculate-*` kernel function: at least one test per distinct physical mode
2. `calculateNavigationSolution`: full-stop vs waypoint; verify trajectory and delta-v differ correctly
3. `calculateSensorShadow`: each shadow type produces correct penalty for each sensor mode
4. `resolveVehicleAttack`: arc-in vs arc-out; shadow-present vs shadow-clear; hit vs miss
5. `resolveVehicleMitigation`: identical test cases as MitigationEngine (same math, different input shape)
6. `resolveRepairAction`: each success tier (1/2/3+ successes) produces correct restoration
7. `logAction` (state): defer costs 0 AP; detect/repair/operate each cost 1 AP; remaining AP recalculated

### 7.2 Test Paths

```
tests/vehicle-combat/
  kernel/
    calculate-navigation-solution.test.js
    calculate-brachistochrone.test.js
    calculate-gravity-cost.test.js
    calculate-sensor-shadow.test.js
    calculate-thermal-detection.test.js
    calculate-denial-intersection.test.js
    calculate-debris-impact.test.js
    calculate-mine-detonation.test.js
    calculate-kessler-cascade.test.js
    calculate-firing-arc.test.js
    calculate-heat-generation.test.js
    calculate-g-stress.test.js
    calculate-system-degradation.test.js
    calculate-system-cascades.test.js
    resolve-vehicle-attack.test.js
    resolve-vehicle-mitigation.test.js
    resolve-repair-action.test.js
    resolve-sensor-sweep.test.js
    resolve-debris-impact.test.js
    vehicle-hit-location.test.js
  state/
    state-manager.test.js
    update-vehicle-position.test.js
    update-vehicle-system.test.js
  modules/
    get-phase-visuals.test.js
    declare-action.test.js
    get-vehicle-card-data.test.js
```

---

## Step 8: Directory Structure

```
modules/vehicle-combat/
  state/
    state-manager.js               // Mirrors CCT state-manager.js
    update-vehicle-position.js
    update-vehicle-system.js
    update-vehicle-propellant.js
    update-vehicle-heat.js
    create-debris-cloud.js
    update-debris-cloud.js
    create-mine.js
    remove-mine.js
  kernel/
    calculate-navigation-solution.js
    calculate-brachistochrone.js
    calculate-waypoint-velocity.js
    calculate-gravity-cost.js
    calculate-hill-sphere.js
    calculate-lagrange-positions.js
    calculate-gravity-gradient.js
    calculate-drift-trajectory.js
    calculate-3d-distance.js
    calculate-propellant-cost.js
    calculate-denial-intersection.js
    calculate-debris-impact.js
    calculate-velocity-matching-cost.js
    calculate-mine-detonation.js
    calculate-kessler-cascade.js
    calculate-cloud-dispersal.js
    calculate-sensor-shadow.js
    calculate-sensor-coverage.js
    calculate-thermal-detection.js
    calculate-last-known-position.js
    calculate-firing-arc.js
    calculate-heat-generation.js
    calculate-heat-consequences.js
    calculate-g-stress.js
    calculate-system-degradation.js
    calculate-system-cascades.js
    resolve-vehicle-attack.js
    resolve-vehicle-mitigation.js
    resolve-repair-action.js
    resolve-crew-casualty.js
    resolve-sensor-sweep.js
    resolve-debris-impact.js
    resolve-mine-damage.js
    calculate-atmosphere-effects.js
    calculate-water-effects.js
    calculate-terrain-effects.js
    validate-navigation-action.js
    validate-deploy-denial.js
    vehicle-catalog.js
    system-adjacency.js
    system-degradation-table.js
    sensor-shadow-table.js
    vehicle-hit-location.js
  projector/
    gm-console.js                 // Mirrors CCT gm-console.js
    foundry-app-shell.js
    tactical-scene-renderer.js
    ship-model-renderer.js
    engine-glow-renderer.js
    velocity-vector-renderer.js
    trajectory-preview-renderer.js
    drift-line-renderer.js
    weapon-arc-renderer.js
    weapon-fire-renderer.js
    explosion-renderer.js
    explosion-debris-renderer.js
    sensor-cone-renderer.js
    shadow-volume-renderer.js
    contact-marker-renderer.js
    sensor-sweep-renderer.js
    thermal-signature-renderer.js
    gravity-well-renderer.js
    lagrange-point-renderer.js
    satellite-shell-renderer.js
    debris-cloud-renderer.js
    minefield-renderer.js
    chaff-cloud-renderer.js
    denial-overlay-renderer.js
    kessler-warning-renderer.js
    atmosphere-shell-renderer.js
    terrain-mesh-renderer.js
    water-surface-renderer.js
    damage-flash-renderer.js
    selection-ring-renderer.js
    hud-overlay-renderer.js
    sensors-view-renderer.js
    generate-vehicle-manifest.js
    input-handler.js
    character-sheet-integration.js  // Mirrors CCT character-sheet-integration.js
  modules/
    render-vehicle-card.js         // Mirrors CCT render-npc-card.js
    attach-listeners.js             // Mirrors CCT attach-listeners.js
    declare-action.js              // Mirrors CCT declare-action.js
    get-phase-visuals.js           // Mirrors CCT get-phase-visuals.js
    get-vehicle-card-data.js        // Mirrors CCT get-combatant-card-data.js
    inject-phase-controls.js       // Mirrors CCT inject-phase-controls.js
    trigger-attribute-roll.js       // Mirrors CCT trigger-attribute-roll.js
  bridge/
    combat-controller.js           // Mirrors CCT combat-controller.js
    main.js                        // Mirrors CCT main.js
    round-resolver.js
    token-sync.js
    combat-socket.js
    ap-roller.js
  styles/
    vehicle-combat.css             // Mirrors CCT styles.css
  templates/
    gm-console.html                // Mirrors CCT gm-console.html
    vehicle-card.html              // Mirrors CCT npc-combat-card.html
    combat-ui.html                 // Mirrors CCT combat-ui.html
    player-console.html            // Mirrors CCT player-console.html
```

---

## Step 9: Implementation Order

| Phase | Scope | Key Deliverables |
|---|---|---|
| **1** | Module skeleton | `main.js`, `module.json`, `combat-controller.js`, `state-manager.js` - copies of CCT patterns |
| **2** | GM console + card | `gm-console.js`, `vehicle-card.html`, `get-vehicle-card-data.js`, `attach-listeners.js` - 4 action types (Defer/Detect/Repair/Operate) |
| **3** | Sheet integration | `character-sheet-integration.js`, `combat-ui.html` - injected into character sheet |
| **4** | Navigation kernel | `calculate-navigation-solution.js` + all navigation kernel files |
| **5** | Denial kernel | All `calculate-denial-*.js` and `resolve-debris/mine-*.js` |
| **6** | Sensor shadow kernel | `calculate-sensor-shadow.js` + coverage + thermal |
| **7** | Combat kernel | `resolve-vehicle-attack.js`, MitigationEngine adapter, hit locations, system degradation |
| **8** | Domain kernel | Atmosphere, water, terrain effects |
| **9** | Round resolver | `round-resolver.js` - Detect -> Repair -> Operate per phase |
| **10** | State mutations | Vehicle position/system/propellant/heat writes |
| **11** | Tests | All kernel + state boundary-trace tests |
| **12** | Pixi3D shell | `foundry-app-shell.js` - ApplicationV2 with blank canvas |
| **13** | 3D core projectors | Ships, trajectories, drift, selection, HUD |
| **14** | 3D environment projectors | Gravity wells, shells, terrain, water |
| **15** | 3D denial projectors | Debris, mines, chaff, shadows, cascade warning |
| **16** | 3D combat projectors | Weapons, explosions, damage flash, arcs |
| **17** | Full integration | Crew assignment, GM scene setup, token sync |

---

## Step 10: Key Design Decisions

### D1: Four Action Types Mirror CCT Exactly

CCT has Defer/Flee/Defend/Fight in a 2x2 grid. Vehicle Combat has Defer/Detect/Repair/Operate in the same 2x2 grid. Same positions, same AP cost logic, same phase visual states, same socket sync. A developer who understands CCT can immediately understand vehicle combat.

### D2: Detect Before Repair Before Operate

The phase ordering creates tactical sequence: you detect the enemy before you repair your systems before you fire your weapons. This avoids the "everything happens at once" problem and gives each crew station its moment of agency.

### D3: Operate Combines Pilot + Gunner

In the existing spec, pilot and gunner were separate stations with separate phases. Consolidating them into a single Operate action simplifies the phase structure and matches CCT's single Fight action. The player chooses between navigation and gunnery when they declare Operate - this mirrors choosing between melee and ranged when declaring Fight.

### D4: State on Combat Flag, Not Actor Data

Following CCT's pattern, combat state (actions, AP, phase) lives on the Foundry Combat document flag. Vehicle state (systems, propellant, position) lives on the actor/scene data. This separation means combat state resets cleanly between encounters while vehicle damage persists.

### D5: Same Hit Location and Mitigation

Vehicle system blocks use the same d10 mapping and MitigationEngine as personal combat body parts. This is not an analogy - it's the same code path. The only difference is what the damage applies to: a body location vs a vehicle system block.

### D6: Kessler Cascade is GM-Notification, Not Automatic

The kernel computes risk and presents it. The GM decides narrative consequences. This prevents accidental campaign-scale destruction.

### D7: Every Destroyed Ship Creates Debris

Combat generates emergent denial terrain. Combined with Kessler risk, this creates incentive for short, decisive engagements.

### D8: Sensor Shadows Stack Additively

Multiple shadow sources between sensor and target sum penalties. A ship behind chaff inside a shell is effectively invisible. The EW officer's job is to map and exploit shadow topology.