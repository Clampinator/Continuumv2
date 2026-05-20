# Lifeline Implementation Guide: From Scratch

## Summary
The **Lifeline** is a specialized temporal visualization and mechanical engine designed for the Continuum RPG. Its purpose is to solve the complex problem of tracking a character's "Subjective Age" against "Objective History." The core of the system is the **Functional Contract**, which mandates that for every second of personal experience, exactly 1000 milliseconds of chronological time must pass, unless a "Span" (time travel) event occurs. 

Architecturally, the system is built on a **Service-Oriented Painter Model**. High-level services manage the mathematical projection, chronological sorting, and resonance calculations, while a modular SVG rendering pipeline handles the visual output. This decoupling allows the system to remain performant even with hundreds of historical nodes, providing a tactile, non-linear interface for managing time-travel gameplay.

---

## Phase 1: The Mathematical Foundation
**Goal**: Establish the physical and visual laws that govern the timeline.

*   **Define Constants**: Create a core utility file for temporal constants ($1s Subjective = 1000ms Objective$).
*   **Visual Ratio**: Define the `TARGET_RATIO` (approx. -0.00045) to maintain the 30-degree visual sweep.
*   **Coordinate Systems**: Establish the relationship between **Screen Space** (pixels), **SVG Space** (local coordinates), and **World Space** (Age in seconds and Time in ms).

### Implementation Details:
The bedrock of the Lifeline is the **Functional Contract** (1s Age = 1000ms Time). This should be implemented as a central utility service (`TemporalConstants.js`) exporting variables like `MS_PER_SECOND = 1000` and `SECONDS_IN_YEAR = 31536000`. This ensures that every calculation in the system—from span costs to resonance bonuses—uses the same mathematical baseline.

To achieve the requested **30-degree visual sweep**, you must implement a specific ratio in your viewport transformation. Calculate `TARGET_RATIO = -0.00045`. This value represents the ratio of `scaleY / scaleX`. When rendering the SVG, the vertical scale (Time) must be roughly 0.00045 times the horizontal scale (Age). This compensates for the massive numerical difference between a single second of age and the thousands of milliseconds in a chronological timestamp, resulting in a visually balanced 30-degree diagonal line.

You must implement a **Coordinate Converter** service with two primary methods:
1.  `worldToScreen(age, time, viewState)`: Applies the current pan (`viewState.x`, `viewState.y`) and scale (`viewState.scaleX`, `viewState.scaleY`) to world coordinates to find the pixel position on the SVG.
2.  `screenToWorld(x, y, viewState)`: The inverse operation, essential for interaction. It must subtract the pan and divide by the scale to resolve a mouse click back into an exact Subjective Age and Objective Time.

**Tech Stack**: Vanilla ES6 JavaScript, Math.js (optional for matrix transformations).
**Foundry Hooks**: None required for this phase.


---

## Phase 2: Data Modeling and Schema
**Goal**: Structure the Foundry VTT Actor data to support complex temporal history.

*   **Nested Hierarchy**: Design the `system.eras` object to contain nested `experiences`, which in turn contain `events`.
*   **Flat Collections**: Set up `system.theYet` and `system.goals` for asynchronous temporal obligations.
*   **Actor Preparation**: Implement `prepareData` logic to resolve dynamic values like `maxSpanPool` and `isLeveller` based on the character's Span rank.

### Implementation Details:
The data model must balance hierarchical organization with efficient querying. Define the core Actor schema in `template.json` using the following structure:
- `system.eras`: An object where keys are unique IDs and values represent chronological containers.
- `system.eras.<id>.experiences`: A nested object for specific learning periods.
- `system.eras.<id>.experiences.<id>.events`: The leaf nodes containing the actual spacetime coordinates (`age`, `date`, `time`).

For the **Yet** and **Goals**, use flat collections (`system.theYet` and `system.goals`) rather than nesting them within Eras. This is because these items often lack a fixed subjective age until they are fulfilled. Each item should have a unique ID, a description, and a `done` status. Goals require an additional `importance` field (e.g., "Critical", "Mild") to drive the color-coding in the UI.

In your Actor's `prepareData` method (or a specialized `prepareDerivedData` hook), you must resolve temporal metadata that isn't stored directly but is essential for the engine:
1.  `spanRank`: Cast `system.spanning.span` to a Number.
2.  `maxSpanPool`: Map the `spanRank` to a total seconds capacity (e.g., Span 1 = 1 year, Span 2 = 10 years).
3.  `isLeveller`: A boolean flag where `spanRank === 0`.
4.  `totalWoundIP`: Sum the IP (Incidental Penalty) from all wounds to be used in the Diagonal Authority calculations (if applicable).

**Tech Stack**: Foundry VTT `DataModel` (V10+), JSON Schema.
**Foundry Hooks**: `Actor#prepareData`, `Actor#prepareDerivedData`.


---

## Phase 3: The Temporal Mapping Engine
**Goal**: Build the engine that converts history into coordinates.

*   **The Diagonal Rail**: Implement a service that projects a point from a Birth Date (Origin) along the 1:1 diagonal.
*   **Objective Offset**: Develop the logic to shift the chronological "rail" whenever a Span event is encountered.
*   **Span Pool Tracking**: Create a consumption ledger that calculates the absolute time delta of every span and maintains the character's remaining capacity.

### Implementation Details:
The Mapping Engine (`LifelineEngine.js`) must process the character's event stream to generate a list of "Graph Nodes." It works through sequential projection:
1.  **Initialize**: Start at `SubjectiveAge = 0` and `ObjectiveTime = BirthDate`.
2.  **Iterate**: For each event in the sorted history:
    -   If the event is **Level** (normal), the change in Age ($\Delta A$) is added to both the world Age and the world Time ($WorldTime = LastTime + \Delta A \times 1000$).
    -   If the event is a **Span**, the world Age remains constant, but the world Time jumps to the Span's `arrivalDate`. This jump creates an `objectiveOffset`.
3.  **Project**: The "Now" cursor is the final projection. Calculate it by taking the `SubjectiveNow` value from the Actor and projecting it along the final rail segment starting from the last historical node.

Implement the **Span Pool Ledger** as a companion service. For every `isSpan: true` event, calculate `Math.abs(departureTime - arrivalTime)` in seconds. Subtract this from the Actor's `maxSpanPool`. If a `isRest: true` event is encountered, reset the accumulated spent seconds to zero. This ledger should return a `remainingSpanSeconds` value and an `isOverSpan` boolean to the UI.

**Tech Stack**: Vanilla ES6 JavaScript.
**Methods**: `calculateLifelineCoordinates(actor, events)`, `processSpanPool(events)`.


---

## Phase 4: SVG Rendering Pipeline
**Goal**: Create a performant and interactive visual container.

*   **Layer Management**: Set up a multi-layered SVG (Grid, Paths, Experiences, Nodes, Overlays).
*   **Viewport Controller**: Implement Pan and Zoom functionality using transformation matrices to map World Space to SVG Space.
*   **Painter Pattern**: Develop modular "Painters" that can be called independently to redraw specific layers when data changes.

### Implementation Details:
The SVG should be structured into logical groups (`<g>`) to maintain a clean Z-index order and allow for partial redrawing. Order the layers as follows:
1.  `.graph-grid-layer`: Background grid lines.
2.  `.graph-era-layer`: Vertical background columns.
3.  `.graph-experiences-layer`: Shaded experience blocks.
4.  `.graph-paths-layer`: Polyline connections between events.
5.  `.graph-nodes-layer`: Event circles and the "Now" head.
6.  `.graph-overlay-layer`: Transient UI elements like ghosts or connection lines.

Implement the **Viewport Controller** using a `viewState` object that stores `x`, `y`, `scaleX`, and `scaleY`. Use a `renderGraph(svg, viewState, graphData)` orchestrator that clears the layers and iterates through the **Painters**. To optimize performance during pan/zoom, use `requestAnimationFrame` to debounce the render calls. 

Each **Painter** (e.g., `SubwayPainter.js`, `GridPainter.js`) should be a stateless function that receives the SVG group and the data it needs. For example, `SubwayPainter.draw(layer, viewState, nodes)` would iterate through the node array, use the **Coordinate Converter** to find screen positions, and append `<polyline>` and `<circle>` elements. Use CSS classes (defined in a shared `.css` file) for all styling to keep the JavaScript focused on layout and logic.

**Tech Stack**: SVG 1.1, CSS3, `requestAnimationFrame`.
**Foundry Hooks**: `renderActorSheet`.


---

## Phase 5: Visualization Enhancements
**Goal**: Add visual depth and readability to the graph.

*   **Subjective Fading**: Implement distance-based opacity calculations for experiences receding into the subjective past.
*   **Collision Detection**: Develop a greedy vertical-stacking algorithm to prevent labels for overlapping experiences from clashing.
*   **Era Columns**: Render background columns to provide broad chronological context.

### Implementation Details:
For **Subjective Fading**, the `ExperiencePainter` must calculate an `opacity` value for each block. Use a `FADE_LIMIT` constant (e.g., 50 years in seconds).
- `distance = subjectiveNow - experienceEndAge`
- `opacity = Math.max(0.1, 1.0 - (distance / FADE_LIMIT))`
Apply this opacity to both the `<rect>` and the associated `<text>` label to visually represent the "fading memory" of the character.

Implement **Label Collision Detection** using a greedy top-down sweep. 
1.  Sort the active experiences by their Subjective Age.
2.  Maintain an array of `occupiedZones` (storing the `y` and `width` of placed labels).
3.  For each new label, check if its default `y` position overlaps with any existing zones.
4.  If it overlaps, increment its `y` offset (e.g., by 15px) and re-check until a clear slot is found.
This prevents labels from becoming unreadable in high-density areas of the lifeline.

Render **Era Columns** as simple `<rect>` elements in the background layer. Use the same `worldToScreen` logic to determine their `x` and `width`. Give them a distinct CSS class (`.graph-era-rect`) with a low-contrast fill and a dashed stroke to differentiate them from active Experience blocks.

**Tech Stack**: SVG, CSS Transitions (for opacity).
**Algorithms**: Greedy sweep for collision, linear interpolation for fading.


---

## Phase 6: Chronology and Reindexing Services
**Goal**: Ensure data integrity and chronological order.

*   **Age-First Sorting**: Implement a canonical sort that prioritizes Subjective Age to enforce the "Diagonal Authority."
*   **Stable Sorting**: Ensure that events at the same age/time are consistently ordered using `sort` values, creation dates, and IDs.
*   **Sequential Sort Assignment**: Develop a service to automatically assign and gap "sort" values to accommodate future insertions.

### Implementation Details:
The `reindexLifelineNodes` service is the source of truth for the character's timeline. It must implement a **Multi-Key Stable Sort**:
1.  **Primary Key**: `age` (Subjective Age).
2.  **Secondary Key**: `sort` (User-defined or system-assigned sequence).
3.  **Tertiary Key**: `createdAt` (Timestamp of event creation).
4.  **Fallback**: `id` (Unique ID string).
This ensures that the timeline remains stable and predictable, preventing "node jumping" when multiple events occur at the same subjective age.

Implement a **Sequential Sort Gapping** algorithm to handle event insertions. When the reindexer runs:
- Flat-map all Eras, Experiences, and Events into a single array.
- Sort the array using the stable sort above.
- Re-assign a `sort` value to every node, using a gap of 1000 (e.g., 1000, 2000, 3000).
- When a user inserts a node between 1000 and 2000, the system can easily assign 1500 without triggering a full reindex of the entire Actor.

This service should return a `updates` object formatted for `actor.update()`, containing the new `sort` values and any coordinate normalization required. This minimizes database writes by batching all chronological adjustments into a single operation.

**Tech Stack**: Vanilla ES6 JavaScript, `Array.prototype.sort()`.
**Methods**: `reindexLifelineNodes(actor, targetEventId, targetSortValue, targetCoordinates)`.


---

## Phase 7: The Interaction Layer
**Goal**: Enable direct manipulation of the character's position in time.

*   **The "Now" Node**: Create a projected head node that can be dragged along the current diagonal rail.
*   **Snap-to-Rail**: Implement interaction logic that snaps the cursor to valid physical paths during a drag operation.
*   **Span 0 Lockout**: Add a hard block to the interaction handler that prevents vertical movement for characters with no Span rank.

### Implementation Details:
The Interaction Layer resides in `PointerMoveHandler.js` and `InteractionController.js`. Use a `viewState.interactionMode` to track what the user is doing (e.g., `'pan'`, `'drag-node'`, `'drag-yet'`).

Implement the **Drag Logic** for the "Now" node:
1.  On `pointerdown` over the head node, record the starting `WorldAge` and `WorldTime`.
2.  On `pointermove`, use `screenToWorld` to find the mouse's current position.
3.  Calculate the `dx` (Age delta) and `dy` (Time delta).
4.  Apply **Snap-to-Rail**:
    -   If the drag is primarily horizontal, lock the `WorldTime` to follow the current diagonal rail ($Time = StartTime + (CurrentAge - StartAge) \times 1000$).
    -   If the drag is primarily vertical, lock the `WorldAge` and allow the `WorldTime` to change (Spanning).

Enforce the **Span 0 Lockout** within the vertical drag logic:
```javascript
if (mode === 'span' && actor.system.spanning.span === 0) {
    // Hard block: do not update time if rank is zero
    mode = null; 
    isValid = false;
}
```
Use the `DragTooltipService` to provide real-time visual feedback, showing a "warning" style if the drag is invalid.

**Tech Stack**: Native Pointer Events (`pointerdown`, `pointermove`, `pointerup`).
**Methods**: `InteractionController.onHeadDrag(event)`, `DragMath.constrainMovement(rawWorld, startWorld, mode)`.


---

## Phase 8: Insertion and Modification
**Goal**: Allow users to retrospectively edit their history.

*   **Non-Destructive Insertion**: Implement logic to insert "level" nodes between existing events without altering their coordinates.
*   **Downward Propagation**: Develop the shift logic that moves all future objective times when a retrospective Span is inserted.
*   **Diagonal Preservation**: Create a projection service to "fix" manual date overrides, keeping departure nodes physically valid on the rail.

### Implementation Details:
To support retrospective edits, your `InsertionService.js` must handle **Diagonal Preservation**. When a user manually edits the departure date of a span:
1.  Identify the current `ObjectiveOffset` of the rail segment where the edit is occurring.
2.  Project the new date onto the 1:1 rail to resolve the corresponding `SubjectiveAge` ($Age = (NewDate - Offset) / 1000$).
3.  Update the event's age and date simultaneously to ensure it remains a valid point on the character's personal timeline.

Implement **Downward Propagation** within your reindexing loop. If an event is a `isSpan: true` node and its arrival time changes:
1.  Calculate the `timeDelta` (NewArrivalTime - OldArrivalTime).
2.  Iterate through all nodes with a higher `sort` value (future nodes).
3.  Add the `timeDelta` to their objective dates.
4.  Update their `system.eras...events...date` and `...time` strings accordingly.
This ensures that the character's "future" history remains chronologically consistent with the new time jump.

For **Level Insertions**, use a "Ghost Node" approach. During a `pan` mode with a specialized modifier key, render a translucent circle on the path. Use the **Path Interpolation** logic from Phase 9 to calculate the exact world coordinates for the ghost. On click, trigger a creation dialog pre-filled with these coordinates.

**Tech Stack**: Vanilla ES6 JavaScript, `foundry.utils.mergeObject`.
**Logic**: Date-to-Subjective projection math.


---

## Phase 9: Informational Overlays
**Goal**: Provide real-time data feedback via context-sensitive tooltips.

*   **HTML Overlays**: Build a service to manage tooltips in the `document.body` to avoid Z-index issues.
*   **Precision Discovery**: Implement a path-hover handler that interpolates exact spacetime coordinates between any two historical nodes.
*   **Context Mapping**: aggregate metadata (locations, dates) for experiences to show in hover states.

### Implementation Details:
To resolve Z-index clipping in Foundry VTT windows, use **HTML overlays** appended to `document.body` instead of inline SVG tooltips.
1.  **Experience Tooltips**: In your `HoverHandler.js`, detect mouseover events on experience blocks. Fetch the `eraId` and `expId` from data attributes. Aggregate the data (Primary Location, Date Range) and inject it into a global `div.experience-hover-tooltip`. Update its `top` and `left` styles on every mouse move.
2.  **Path Interpolation (Discovery)**: Implement a "Precision Discovery" loop. For every segment in the level-node path:
    -   Calculate the distance from the mouse point to the line segment.
    -   If the distance is < 15px, calculate the interpolation factor `t` (0 to 1).
    -   `WorldAge = P1.Age + t * (P2.Age - P1.Age)`
    -   `WorldTime = P1.Time + t * (P2.Time - P1.Time)`
    -   Show a specialized "Discovery Tooltip" showing the exact interpolated Spacetime position.

For the **Drag Tooltip**, update the HTML content on every frame of the `pointermove` event. Show three lines of data:
- Current Spacetime (Age/Time).
- Travel Delta (Years/Days since drag start).
- Status (e.g., "VALID", "LOCKED", "OVER SPAN").

**Tech Stack**: HTML5, absolute positioning, string interpolation.
**Foundry Hooks**: None (use native DOM manipulation).


---

## Phase 10: Mechanical Integrations
**Goal**: Connect the timeline to the core RPG mechanics.

*   **Resonance Calculator**: Build a service to map "Subjective Recency" to numerical dice roll bonuses.
*   **Yet Fulfillment**: Implement the drag-and-drop loop that converts a future "Yet" into a fulfilled history event.
*   **Goal Connections**: Develop transient SVG connectors that link HUD goal chips to the historical events that satisfy them.

### Implementation Details:
The **Resonance Calculator** should be a service that returns an array of active bonuses.
- Iterate through all Experience blocks.
- Calculate `diffYears = (SubjectiveNow - EndAge) / SECONDS_IN_YEAR`.
- Use a tiered mapping: `< 2y = +3`, `< 7y = +2`, `< 15y = +1`.
Hook into Foundry's `d20Roll` (or custom roll method) to present these as situational modifiers in the roll dialog.

Implement **Yet Fulfillment** as a specialized `pointerup` handler.
1.  Detect when a `draggedYetId` is dropped within 25px of the `nowNode`.
2.  Mark the Yet item as `done: true`.
3.  Create a new `isYetFulfillment: true` event at the exact current coordinates of the "Now" head.
4.  Trigger a reindex to solidify the event into the historical record.
Play a confirmation sound (`Sound.confirm()`) to provide immediate haptic feedback.

For **Goal Connections**, implement a `GoalConnectionPainter`. When a user hovers over a Goal chip in the HTML HUD:
1.  Send the `goalId` and the chip's screen coordinates to the SVG view state.
2.  The painter identifies all nodes containing that `goalId` in their `linkedGoalIds` array.
3.  Draw a `<line>` from the chip (converted to SVG space) to each linked node.
4.  Apply a CSS animation to the lines to make them "pulse" or fade-in, highlighting the connection.

**Tech Stack**: Foundry VTT Hooks, Native Audio API.
**Methods**: `calculateResonanceBonuses(actor)`, `handleYetDrop(event)`, `GoalConnectionPainter.draw()`.

---

## Synopsis
The completed **Lifeline** implementation represents a robust, mathematically authoritative temporal engine. By decoupling the core physics (The Diagonal Authority) from the visual representation (The Subway Map), the system achieves a high degree of flexibility and data integrity. The integration of non-linear editing features—like retrospective span insertion and diagonal preservation—allows for a truly "continuum" experience where the past is as malleable as the future. This architecture provides a scalable foundation for any game system requiring complex, multi-axis chronological tracking.

