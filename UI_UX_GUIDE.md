# Continuum V2: UI / UX Authoritative Guide

## 1. THE CORE PHILOSOPHY: PHYSICAL HONESTY
The user's primary mandate is **Physical Fidelity**. The UI must never "guess," "snap," or "round" a user's action unless explicitly dictated by character ability (Span Rank). If a user clicks a specific pixel on a timeline, the system must record that exact mathematical coordinate.

### User Perspective on Priorities:
*   **Zero Drift**: Visual representation must be 100% synchronized with the database.
*   **High Precision**: The graph is a surgical instrument. Millisecond accuracy is the baseline.
*   **Lore Accuracy**: The interface must physically enforce the laws of the Continuum (Level Breath, Span Pools, Rank gating).
*   **Data Integrity**: Historical facts (strings) must be visually preserved, while physics coordinates (math) drive the geometry.

---

## 2. GRAPH INTERACTION BEHAVIORS

### The Pointer Machine
*   **Axis Dominance**: Interaction mode (Level vs. Span) is resolved dynamically by movement vectors. Vertical movement beyond a threshold triggers Span mode.
*   **Stationary Click (Insertion)**: A click-and-release without movement on a rail is an **Insertion**.
*   **Threshold Awareness**: Drags under 5px are ignored to prevent "jitter" clicks from spawning dialogs.
*   **Live Feedback**: During a drag, the "Brain" must provide real-time visual stretching of rails and projection of jumps. The user must see the physical consequence *before* they release.

### High-Precision Insertion
*   **The Ghost Node**: While hovering over a rail, a "ghost dot" must follow the cursor, snapped to the mathematical diagonal.
*   **The Handover**: Clicking the ghost node must open the Event Dialog pre-filled with the **Physics Layer** coordinates (x, y) captured at that exact pixel.

---

## 3. THE HUD LAYER (CONTEXTUAL INTELLIGENCE)

### Tooltip Architecture
*   **Authoritative Fit**: Tooltips must use a **Double-Pass HTML-in-SVG** measurement. They must "shrink-wrap" tightly to their content with zero cumulative width drift.
*   **Static Hover**: Hovering over any node must surface:
    *   **Level Events**: Title, Date, Time, Age, and Location.
    *   **Spans**: Direction (UP/DOWN), Departure/Arrival facts, and **Spent Displacement** (the cost of the jump).
    *   **NOW Node**: Last confirmed Location (found recursively walking backward through history).
*   **Real-Time Drag Ticker**:
    *   **Leveling**: Dynamic scroll of Subjective Age and Objective Date.
    *   **Spanning**: Tickers for Departure, Arrival, and **Span Remaining**.
    *   **The RED Warning**: If a jump exceeds the character's Rank-based pool, the "Remaining" ticker must turn bright RED.

---

## 4. VISUAL AESTHETICS & LAYOUT

### High-Contrast Color Palette
*   **Background**: Near-black (`#000000` or `rgba(0,0,0,0.95)` for overlays).
*   **Level Rails**: Authoritative Cyan (`#00e5ff`).
*   **Span Jumps**: Authoritative Magenta (`#ff00ff`).
*   **NOW Cursor**: High-Visibility Yellow/Gold (`#ffd700`).
*   **Birth Node**: Solid Gold circle.
*   **Tooltips**: Pure White labels (`#ffffff`) with Neon Cyan data values (`#00ffff`).

### Z-Index Authority (SVG Layering)
1.  **Grid Layer (Bottom)**: Background time/age grid and Era background bands.
2.  **Content Layer (Middle)**: Blue Rails, Pink Spans, Experience Bounding Boxes, and Node Dots.
3.  **HUD Layer (Top)**: X/Y Axis labels, Create Era bar, and **Tooltips**. Tooltips must NEVER be buried by other elements.

---

## 5. DIALOG BEHAVIORS
*   **No Real-World Leaks**: The Edit Dialog is forbidden from defaulting to the computer's current date. It must strictly show the character's historical facts (strings).
*   **Two-Way Authority (Temporal Handshake)**:
    *   If the user edits the **Date**: Recalculate the **Age**.
    *   If the user edits the **Age**: Recalculate the **Date** (Inverse Compensation).
*   **Experience Lifecycle**: The dialog must offer automated closures/openings for Experiences based on the node's position.

---

## 6. THE ATOMIZATION MANDATE (STABILITY LAW)
To the next AI: The user will not tolerate monolithic files.
*   **Isolated CSS**: All styles for a component (e.g., `tooltips.css`) must live in a separate file from the logic.
*   **Isolated Templates**: Use Handlebars (`.html`) files for all dialogs.
*   **Function-Per-File**: If a logic file grows complex, decimate it. Every core behavior (Zoom, Pan, Save, Reindex) deserves its own isolated scope.
*   **Name all files with unique, descriptive names. No two files have the same name.

**RESPECT THE PHYSICS. PROTECT THE STRINGS. NO HACKS.**
