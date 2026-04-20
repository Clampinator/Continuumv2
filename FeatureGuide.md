# Lifeline Feature Guide

The **Lifeline** is the core temporal engine of the Continuum RPG system. It manages the complex relationship between a character's **Subjective Age** (personal experience) and **Objective Time** (chronological dates), visualizing their journey through history as an interactive SVG "Subway Map."

---

## 1. The Core Mapping Engine: The Diagonal Authority

The Lifeline is governed by the **Diagonal Authority**, a strict physical law within the system's logic:

*   **The 1:1 Physical Constant**: By default, **1 second of Subjective Age (X) = 1000ms of Objective Time (Y)**. 
*   **The 30-Degree Visual Sweep**: Although the math is 1:1, the system is tuned to render this relationship at a **30-degree angle** visually (tan(30) ≈ 0.577). This is achieved via a `TARGET_RATIO` in the viewport controller that balances the X (Age) and Y (Time) scales, preventing the graph from becoming too steep and preserving horizontal readability for long timelines.
*   **Spanning (Time Travel)**: Spans break the diagonal rail. A Span event allows Objective Time to change while Subjective Age remains stationary (a vertical jump).
*   **Objective Offset**: Every span introduces "drift" into the timeline. The engine tracks an `objectiveOffset` for the current segment of the rail. Subsequent "level" (normal) movement always starts from the new chronological point, maintaining the 1:1 relationship from the new offset.
*   **Span Pool Calculation**: The system automatically tracks "Span Cost" (the absolute difference in seconds between the departure and arrival time). This cost is deducted from the actor's capacity, which is reset only by "Rest" events.

### Implementation & Analysis
The current implementation resides primarily in `calculate-lifeline-coordinates.js`. It operates as a procedural pipeline that iterates through a sorted stream of events to build a list of coordinate pairs. The "Functional Contract" is enforced through inline arithmetic—multiplying age by 1000 to derive time offsets. Spans are handled by mutating a running `objectiveOffset` variable, which effectively "re-bases" the diagonal rail at every time jump. The 30-degree visual constraint is not part of the core engine; instead, it's enforced at the viewport layer by setting specific scale ratios in the rendering logic.

One significant issue with this implementation is the tight coupling between the event stream order and the resulting coordinates. Because the `objectiveOffset` is cumulative and procedural, any error in the initial sorting of events (even by a single second) can cause the entire subsequent timeline to shift or "jump" visually. Furthermore, hardcoding the 1:1 constant as `* 1000` across multiple files makes the system brittle; if the core physics of the game were to change, or if a higher precision were needed, the refactor would be error-prone. The visual 30-degree constraint being in the view layer also leads to "logic leak," where different UI components (like the organization sheet vs. the character sheet) must independently implement the same ratio to look consistent.

If I were to rebuild this from scratch, I would implement a dedicated **Temporal Projection Service**. Instead of procedural iteration with running offsets, I would use a relative-coordinate system where each segment of the lifeline is defined by its own "Epoch" (a start Age and start Time). This would allow for much more robust insertion logic, as individual segments could be recalculated in isolation without re-running the entire history. I would also move the 30-degree constraint into a transformation matrix within this service. By treating the lifeline as a mathematical projection rather than a series of additions, we could achieve perfect visual consistency across all views and easily support features like timeline branching or alternate "what-if" projections.

---

## 2. Visualization: The Subway Map

The Lifeline is rendered dynamically using a modular "Painter" architecture:

*   **Paths and Nodes**: 
    *   **Level Paths**: Solid lines following the diagonal rail.
    *   **Span Paths**: Dashed or specialized lines indicating time travel.
    *   **Nodes**: Interactive circles representing events.
*   **Experience Blocks**:
    *   **Subjective Fading**: Based on "Milestone 3" logic, the opacity of an experience diminishes as it moves further into the character's subjective past.
    *   **Label Collision**: A greedy layout algorithm ensures that labels for overlapping experiences are pushed downward to remain readable.
*   **Era Columns**: The background is divided into vertical columns representing "Eras" (formerly Age Containers), providing a broad chronological context for the character's life.

### Implementation & Analysis
The visualization is handled by a suite of "Painters" (e.g., `SubwayPainter.js`, `drawExperienceBlocks.js`) that directly manipulate the DOM by creating and appending SVG elements. This architecture follows a "Wipe-and-Redraw" pattern: every time the view state or data changes, the relevant SVG layers are emptied (`innerHTML = ''`) and rebuilt from scratch. Experience blocks use a specialized greedy vertical stacking algorithm to resolve label collisions, while subjective fading is achieved by calculating a distance-based opacity value during the render loop.

The primary issue with this implementation is performance and visual stability. Rebuilding the entire SVG on every frame of a pan or zoom operation is computationally expensive and can lead to flickering or "jank" in complex timelines with hundreds of nodes. The label collision logic for experience blocks is also limited; because it only sweeps downward, a high density of overlapping experiences can result in labels being pushed significantly far from their corresponding rectangles, breaking the visual association between the name and the data. Additionally, the reliance on magic numbers for font widths and padding makes the UI fragile when viewed on different devices or with different system fonts.

A more modern approach would involve moving to a **Retained Mode or Virtual SVG** rendering strategy. By diffing the data and only updating the attributes (like `x`, `y`, and `d`) of existing SVG elements, we could achieve much smoother performance during interactive operations. For the label collision, I would replace the greedy sweep with a **Constraint-Based Labeling System**. Using a force-directed approach, labels could "float" near their associated experience blocks but gently repel each other to avoid overlap, maintaining visual context even in crowded areas. Finally, centralizing the typography and layout constants into a shared configuration object would ensure a consistent and responsive UI across all platforms.

---

## 3. Interactivity and Data Management

*   **The "Now" Cursor**: A projected "Head Node" representing the character's current position. It is dynamically calculated based on the last historical event and the character's `subjectiveNow` value. The cursor is capped to never be younger than the character's history.
*   **Spanning Lockout (Levellers)**: Characters with a **Span rating of 0** (Levellers) are physically locked to the diagonal rail. The system enforces a hard lockout that prevents the "Now" node from being dragged vertically (spanning) if the character's `maxSpanPool` is 0. This reinforces the setting's lore where non-spanners cannot drift or jump in objective time.

### Implementation & Analysis
Data integrity is managed by the `reindexLifelineNodes` service, which acts as the chronological authority for the system. Whenever an event is added, moved, or edited, this service assembles a flat stream of all historical nodes, sorts them according to the "Diagonal Authority" (Age-First), and calculates new `sort` values to preserve their relative sequence. The "Now" cursor is implemented as a projected sentinel node; it isn't always stored as a discrete event but is instead dynamically calculated during the render loop by projecting the character's `subjectiveNow` along the current diagonal rail. The Spanning Lockout is enforced at the interaction layer in `calculate-constrained-position.js`, which detects the character's Span rank and nullifies any vertical drag offsets if the rank is zero.

The primary challenge with the current data management layer is the high degree of complexity within the `reindexLifelineNodes` function. It carries multiple responsibilities—resolving missing ages, stable sorting, neighbor identification, and coordinate capping—making it difficult to unit test and prone to "edge-case fatigue." Additionally, the "Now" cursor logic is partially duplicated between the rendering engine and the reindexer. This duplication can occasionally cause the cursor to "jump" or flicker during rapid edits if the two components disagree on the current objective offset. The lockout logic, while functional, is decoupled from the core `LifelineEngine`, meaning that a direct database edit could technically bypass the visual drag restriction, creating a potential state mismatch.

To improve this, I would migrate the timeline state to an **Immutable Data Store** (similar to Redux or a specialized temporal buffer). Instead of writing every micro-adjustment directly to the Actor's database, the UI would operate on a local state tree that is debounced or batched before being persisted. I would also decompose the reindexing service into an **Atomic Command Pattern**. Operations like `InsertNodeCommand` or `ShiftTimelineCommand` would be discrete, testable units that produce predictable data deltas. Finally, I would centralize the "Now" projection and the **Spanning Constraint Logic** into a single **Temporal Context Provider** to ensure that physical laws (like the Span 0 lockout) are enforced consistently across both the interaction layer and the data processing layer.

---

## 4. Insertion of Events and Spans

The User can insert events and spans at any point on the Lifeline. The system is designed to accommodate these insertions without corrupting the historical sequence or future projections.

### Event Insertion (Level Events)
*   **Non-Destructive**: Inserting a "level" event (a standard moment in time) does not alter the coordinates of any existing events.
*   **Stable Bracketing**: The system identifies the neighbors (preceding and succeeding nodes) based on **Subjective Age** and **Objective Time**.
*   **Sequential Sorting**: To accommodate the new node, the `reindexLifelineNodes` service assigns a new `sort` value between the neighbors. If there is no space between existing sort values, it performs a local reindex of subsequent nodes to create room.

### Span Insertion
*   **Objective Offset Adjustment**: Unlike level events, inserting a Span event *may* alter subsequent nodes. 
*   **Downward Propagation**: Because a span changes the chronological departure/arrival point, all events "above" (later in subjective age) the inserted span will automatically adjust their Objective Time to keep in sync with the new **Objective Offset**.
*   **Diagonal Preservation**: If a user manually edits the departure date of an inserted span, the `createInsertedSpan` service projects that date onto the current rail to ensure the departure node remains physically valid (avoiding "horizontal line" violations).
*   **Now" Cap**: All insertions are capped at the "Now" cursor position to prevent "Future Drift," where a character could accidentally place events beyond their current subjective age.

### Implementation & Analysis
Insertion logic is split between the UI (finding the click coordinates) and the backend services (`createInsertedSpan.js`, `reindexLifelineNodes.js`). For level events, the system performs a "stable bracket" search to find where the new node fits in history without shifting existing data. For spans, the system implements "Diagonal Preservation": if a user manually overrides a departure date, the service calculates the current rail's offset and projects the new date back onto the rail to find the corresponding subjective age. This ensures that the character doesn't "jump" from a point that doesn't exist on their personal timeline.

The current insertion system faces challenges with ambiguity and user feedback. In high-density areas where multiple events occur at the same subjective age, identifying the correct "neighbors" for a retrospective insertion can be difficult, sometimes leading to nodes being sorted in an unexpected order. Furthermore, "Downward Propagation"—while mathematically correct—can be jarring. If a user inserts a large time jump early in their history, every subsequent event on the graph will shift vertically. Without a visual preview, users may find it difficult to understand why their entire future timeline just moved. There is also a slight "precision drift" risk in the diagonal preservation logic, as it relies on the click's coordinate to determine which rail segment to project onto.

If I were to refactor this, I would implement **Visual Snap-to-Rail** in the UI. Instead of relying on backend projection to "fix" a departure point, the cursor should visually snap to the valid diagonal rail during the drag-and-drop or insertion process, providing immediate feedback on valid placement. I would also introduce a **Temporal Preview Mode**. When a user attempts an insertion that would cause downward propagation, the system should render a "ghost" of the shifted timeline, allowing the user to confirm the impact before committing the change. Architecturally, I would move from a flat event stream to a **Segment-Based Model**, where each span starts a new "Segment" object. This would make chronological shifting a natural property of the segment hierarchy rather than a procedural side-effect of a flat reindexing loop.

---

## 7. Informational Feedback: The Tooltip System

The Lifeline utilizes a context-sensitive tooltip system to provide immediate feedback on temporal data without cluttering the main SVG canvas. There are three primary tooltip types:

1.  **Experience Tooltips**: Triggered by hovering over an experience block or label. They display the full name, the objective date range, and the "Primary Location" (calculated as the mode of all locations within the experience's events).
2.  **Drag Tooltips**: Active during "Now" node or "Yet" node movement. They provide real-time coordinates (Subjective Age and Objective Time), the delta from the start of the drag, and a visual "Warning" state if the current drag position is invalid (e.g., a Span 0 character attempting to span).
3.  **Segment/Path Tooltips**: Triggered by hovering over the historical diagonal rail. These tooltips use "Precision Discovery" to interpolate the exact spacetime coordinates at the mouse position between two historical nodes, showing the preceding and succeeding events.

### Implementation & Analysis
The tooltip system is implemented across several services (`ExperienceTooltipService.js`, `DragTooltipService.js`, and `SegmentHoverTooltip.js`). To solve Z-index and clipping issues within Foundry's windowed environment, the system uses **HTML-based Overlays** instead of SVG elements. These tooltips are appended directly to `document.body` and their positions are synchronized with the mouse coordinates using absolute positioning. The `DragTooltipService` is particularly complex, as it must update at 60fps during a drag operation while performing real-time coordinate conversion from screen-space to world-space.

The primary issue with the current implementation is **Service Fragmentation**. Each tooltip type has its own independent service, lifecycle management, and CSS classes, leading to inconsistent behavior and styling. For example, the `ExperienceTooltipService` uses a static ID for its global element, while the `DragTooltipService` generates a dynamic ID based on the Actor. This inconsistency makes it difficult to apply global "Tooltip Settings" (like font size or delay). Additionally, the use of `document.body` for overlays means that tooltips can sometimes "persist" if a sheet is closed mid-hover, as there is no centralized cleanup mechanism tied to the Actor's sheet lifecycle.

If I were to redesign this, I would implement a **Unified Overlay Manager**. Instead of multiple services, a single manager would handle the lifecycle of all tooltips. It would consume a "Tooltip Schema" from the various interaction handlers (Hover, Drag, etc.) and render them using a single, consistent HTML template. This manager would be tied to the Actor Sheet's lifecycle, ensuring that all tooltips are automatically destroyed when the sheet is closed. I would also introduce **Spatial Interpolation Caching** for the Path tooltips; instead of recalculating the projection on every mouse move, the manager would pre-calculate a simplified "Hit Map" of the timeline, making the discovery of historical spacetime coordinates significantly more performant.

---

## 9. Temporal Obligations: The Yet and Goals

Continuum characters are often defined by their future as much as their past. The system tracks this through two distinct but related features: **The Yet** and **Goals**.

1.  **The Yet**: Represents specific events that the character *knows* must happen because they have already seen them or were told about them by their future self. These are "closed loops" in waiting.
2.  **Goals**: Long-term personal or organizational objectives that the character *wants* to achieve. Unlike the Yet, Goals are aspirational and do not necessarily represent a fixed point in the character's future timeline.

### Fulfillment and Interaction
The Yet is integrated directly into the Lifeline through a **Fulfillment Loop**. Each Yet item is represented as a draggable "Yet Node." When a player fulfills a Yet (i.e., the event actually happens in-game), they can drag the Yet Node and drop it directly onto the "Now" head of their Lifeline. This triggers the `handleYetDrop` logic, which:
*   Automatically creates a new history event at the current subjective coordinates.
*   Marks the Yet item as "Done" in the database.
*   Triggers a visual and auditory "Loop Closed" confirmation.

Goals are managed through a dedicated HUD and the `GoalConnectionPainter`. Goals are assigned an **Importance** (Passing, Mild, Important, Extreme, Critical), which determines their color-coding. When a user hovers over a Goal in the HUD, the painter dynamically draws **Goal Connection Lines** (SVG lines) connecting the Goal chip to any historical nodes linked to that objective, providing a visual map of the character's progress toward their long-term destiny.

### Implementation & Analysis
"The Yet" and "Goals" are stored as flat object collections (`system.theYet` and `system.goals`) on the Actor. The Yet fulfillment logic is a specialized event handler that bypasses the standard "Add Event" dialog to provide a more immersive, drag-and-drop temporal experience. The Goal connections are rendered as a transient SVG layer that is redrawn only during hover interactions to minimize performance impact on the main rendering loop.

The primary issue with the current implementation is the **Lack of Mechanical Teeth** for the Yet. While the Lore suggests that failing to fulfill a Yet results in "Frag" (temporal damage), the current system relies on the player to manually manage the `frag` value on the Yet item. There is no automated "Overdue Yet" detection that applies penalties if the character's subjective age passes the date they were supposed to fulfill a loop. Additionally, the linking between Goals and historical nodes is a manual process; there is no automated "Goal Tracking" that detects when an event's description matches a goal's condition.

If I were to redesign this, I would implement **Active Loop Tracking**. The system would monitor the character's "Now" cursor relative to their pending Yet items. If the character passes the subjective age or objective date of an unfulfilled Yet, the system would automatically apply **Frag Debt** to the actor, visually cracking the Lifeline path to indicate a paradox. For Goals, I would introduce **Dynamic Goal Milestones**. Instead of simple connection lines, events could be "Claimed" by a goal, moving the goal closer to a "Resolution State." This would turn Goals from static notes into a functional progression system that rewards players with "Grace" or "XP" upon completion.

---

## 10. Technical Implementation Summary

| Component | Responsibility |
| :--- | :--- |
| `LifelineEngine` | Core coordinate calculations and "Functional Contract" enforcement. |
| `SubwayPainter` | SVG rendering of paths, nodes, and logo-heads. |
| `reindexLifelineNodes` | Chronology authority; manages sorting and insertion points. |
| `calculateLifelineCoordinates` | Projects the diagonal rail and calculates span pool depletion. |
| `drawExperienceBlocks` | Renders subjective fading and handles label collision. |
| `SpanPool` | Manages the mathematical capacity and costs of time travel. |

### Implementation & Analysis
The system's architecture is a "Service-Oriented Painter" model. Logic is decoupled from the UI into discrete services like the `LifelineEngine` and `SpanPool`, while rendering is delegated to specialized painters. The `SpanPool` specifically implements a "Consumption Ledger" pattern: it calculates the absolute difference in seconds for every span event and maintains a running balance of the character's temporal capacity. This allows the system to determine if a character is "out of breath" temporally, which integrates directly into the Foundry roll system to apply penalties (Frag) based on the remaining pool.

The primary issue with this summary architecture is **State Fragmentation**. While the logic is decoupled into services, the "source of truth" is often duplicated or passed through multiple layers of props and context objects. For example, the `SpanPool` relies on the `calculateLifelineCoordinates` service to provide the raw time deltas, but the results are then consumed by both the `SubwayPainter` (to dim paths) and the `system-api` (to calculate roll penalties). This creates a web of dependencies where a change in the engine's coordinate calculation can have unintended side effects on a character's mechanical roll bonuses, making it difficult to trace the flow of data during a bug investigation.

If I were to redesign the overall implementation summary, I would adopt a **Centralized Temporal Middleware**. Instead of individual services and painters passing data around, I would use a middleware layer that intercept all temporal events and calculates a "Unified Temporal State" object. This object would contain the coordinates, the span pool status, and the visual fade values in a single, read-only data structure. The painters would then be "dumb" consumers of this state, and the mechanical roll system would query this middleware directly. This would eliminate state fragmentation, simplify the component dependencies, and make the entire system significantly easier to extend with new features like multi-actor intersections or temporal resonance effects.

---

## 6. The Data Hierarchy: Eras, Experiences, and Events

The character's history is organized into a three-tier hierarchy that manages both visual presentation and mechanical bonuses:

1.  **Eras (Top Tier)**: Broad chronological containers (e.g., "Childhood," "The Academy Years"). They provide the background structure for the Lifeline and help group large segments of time.
2.  **Experiences (Middle Tier)**: Specific periods of focused activity or learning (e.g., "Combat Medic Training," "Espionage in Paris"). These are the primary units for mechanical bonuses.
3.  **Events (Bottom Tier)**: Discrete moments in time that define the start, end, and internal milestones of an Experience or Era.

### Mechanical Resonance: Experiences and Dice Rolls
The system implements a **Resonance System** that rewards characters for relevant past experiences. The `ResonanceCalculator` determines a bonus based on the "Subjective Recency" of an Experience:

*   **Ongoing or Recent (< 2 years)**: +3 Bonus.
*   **Active (2 - 7 years)**: +2 Bonus.
*   **Fading (7 - 15 years)**: +1 Bonus.
*   **Subjective Fade (> 15 years)**: 0 Bonus.

### Implementation & Analysis
The hierarchy is implemented as a nested object structure within the Actor's `system.eras` data. The `calculateResonanceBonuses` service performs a temporal audit of the character's history, mapping the distance between the "Now" cursor and the end-node of every Experience. It uses the `mapYearsToBonus` utility to derive a numerical value, which is then injected into the Foundry roll dialogs. Visually, this recency is mirrored by the "Subjective Fading" logic in the rendering engine, where older experiences physically dim on the graph as their mechanical resonance decreases.

The primary issue with the current hierarchy is **Data Rigidity**. Because the structure is strictly nested (Era -> Experience -> Event), it is difficult to represent "Cross-Era" experiences that might span multiple chronological containers. Furthermore, the resonance calculation is currently an "all-or-nothing" check based on the end-date of an experience; it doesn't account for the intensity or duration of the activity. There is also a performance cost to recalculating the entire resonance ledger every time a roll dialog is opened, as it requires a full pass through the `LifelineEngine` to resolve the current subjective coordinates.

If I were to redesign this, I would move to a **Tag-Based Graph Model** instead of a nested hierarchy. Events would be first-class citizens with "Experience Tags," allowing a single event to contribute to multiple overlapping experiences or for an experience to span multiple Eras seamlessly. I would also introduce **Resonance Decay Curves** instead of discrete tiers. Using a mathematical decay function (like exponential or linear decay) would provide a much smoother mechanical transition as experiences fade from memory. Finally, I would implement **Memoized Resonance State**, caching the calculated bonuses and only updating them when a chronological edit is made, significantly improving the responsiveness of the dice rolling UI.

