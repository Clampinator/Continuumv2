# Specification: Lifeline HUD Refinement (Ghost Nodes & Experience Boxes)

## Overview
A dedicated track to implement high-level visual and interactive refinements on top of the established Span Graph physics. This includes mathematical hover-insertion via "Ghost Nodes" and a robust system for rendering "Experience Boxes" that dynamically track character memory, status, and timeline geometry.

## Functional Requirements

1.  **Ghost Nodes (Mathematical Hover-Insertion)**:
    *   When the user's mouse pointer hovers near the cyan (Level) rail or pink dotted (Span) rail, the system must project a faint, semi-transparent "Ghost Node" exactly onto the nearest mathematical point on the rail.
    *   Clicking this ghost node opens the 'Log Event' dialog pre-filled with the exact interpolated Date and Age.

2.  **Experience Boxes (Visual Memory Tracking)**:
    *   **Origin & Geometry**: Experiences are defined by Event nodes, not a drag bar. A box begins at the Event node designated as the start.
    *   **Open State**: If an Experience has no closing node, its box extends rightward up to the NOW node's position. It is styled as a transparent yellow box with a gradient fade toward the right.
    *   **Closed State**: When an Event node designates the close of an Experience, the box terminates precisely at that node. It is styled as a solid/fully yellow box.
    *   **Re-Opened State**: A later node can designate an Experience as "re-opened," resuming the Open State visual behavior from that point forward.
    *   **Labels & Collision**: Experience boxes display their name. If multiple boxes overlap chronologically, their labels must automatically dodge or stack to remain legible when zoomed out.
    *   **The "Forgetting" Fade**: As the NOW node's Subjective Age progresses beyond an Experience's bounds, the entire box gradually fades out over a span of 15 subjective years, settling at a persistent 10% opacity to simulate fading memory.

## Non-Functional Requirements
-   **Physics Compliance**: Ghost Nodes and Experience Boxes must derive their layout strictly from the authoritative `getTemporalState` coordinates.
-   **Performance Optimization**: Label collision avoidance and hover detection must be calculated efficiently (e.g., via simple spatial bounding or debouncing) to maintain fluid 60fps graph performance.