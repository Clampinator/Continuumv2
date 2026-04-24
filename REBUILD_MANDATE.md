# Continuum V2: Architectural Rebuild Blueprint (DB-FIRST EDITION)

## 1. THE PHILOSOPHICAL LAW: DATABASE AS AUTHORITY
This application is a **Database with a UI on the front**, not a tool with a database on the back.
*   **The DB is the Source**: The character's history is a flat, sorted array of atomic rows.
*   **The UI is a Lens**: The graph has **no power**. It is a dumb display that projects DB rows into pixels.
*   **Two-Way Relationship**: UI inputs are treated as **Requests for Mutation** sent to the DB. The UI only updates when it detects the DB has changed.

## 2. THE STRUCTURAL MANDATE: THE TRINITY
You must isolate the system into three distinct, non-overlapping components:

### A. THE STATE (Database Layer)
*   Lives in `modules/state/`.
*   Holds the **Flat History Array**.
*   Handles **Atomic Mutations**: (e.g., `insertRow`, `updateRow`, `deleteRow`).
*   **Self-Sorting**: The DB is responsible for maintaining its own narrative `sort` order and calculating Subjective `age` offsets.

### B. THE KERNEL (Rules Layer)
*   Lives in `modules/temporal-kernel/`.
*   Pure, stateless functions that enforce the **Laws of the Continuum**.
*   **Validation**: `isSpanLegal`, `calculatePoolConsumption`, `solvePhysicsXtoY`.
*   The Kernel is the only thing allowed to tell the DB how to change.

### C. THE PROJECTOR (View Layer)
*   Lives in `modules/span-graph/renderers/`.
*   **Dumb Pipes**: They receive a **Render Manifest** (a JSON list of X/Y pixels).
*   **Optical Mapping**: The only math allowed in the UI is "World-to-Screen" coordinate conversion.
*   **Zero Logic**: Renderers are forbidden from knowing what a "Span" or "Era" is. They only know how to draw paths and dots.

## 3. THE ATOMIZATION MANDATE (FPF LAW)
*   **Function-Per-File**: No file > 150 lines. Every mutation, every rule, every renderer gets its own file.
*   **Property Isolation**: **Facts** (Date/Time strings) and **Physics** (X/Y coordinates) must never share property names.
*   **Absolute Pathing**: Use `/systems/continuum-v2/modules/...` for all imports.

## 4. EXECUTION FLOW (The Unbreakable Loop)
1.  **User Clicks** a pixel.
2.  **Projector** converts pixel to `Age/Time` and sends to **Kernel**.
3.  **Kernel** validates against character laws and sends update to **DB**.
4.  **DB** updates, re-sorts, and broadcasts a "Changed" event.
5.  **Projector** receives event, wipes the SVG, and re-draws the dots based on the new DB state.

**NO HACKS. NO PATCHES. THE DATABASE IS THE ONLY TRUTH.**
