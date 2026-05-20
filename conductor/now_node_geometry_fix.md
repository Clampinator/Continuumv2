# Plan: Resolving NOW Node Drag Geometry Conflicts

## Objective
Restore the proper dragging and spanning functionality of the 'NOW' node by enforcing the Fact-Only Architecture and eliminating conflicting UI-driven physics calculations.

## Key Files & Context
*   **`modules/span-graph/viewport.js`**: The master render orchestrator. Currently passing an unauthorized `0` fallback for `subjectiveNow` when an interaction ends.
*   **`modules/span-graph/projection/manifest-generator.js`**: The visual projector. Currently drawing the blue leveling rail blindly to the 'NOW' node's dragged position during a span.

## Implementation Steps

### Step 1: Enforce Null Fallback in Viewport
The physics engine must be the sole authority for calculating the biological age of the 'NOW' node when the user is not actively forcing a position via drag.

*   **File:** `modules/span-graph/viewport.js`
*   **Action:** Update the `_render()` method. Modify the `subjectiveNow` variable assignment. When `isDraggingNow` is false or the active node is not 'now', it MUST pass `null` instead of falling back to `0` or reading from the database.
*   **Code Update:**
    ```javascript
    // AUTHORITY: Use the injected virtual history for the entire render pass.
    // If we are NOT dragging the NOW node, we pass null so the Kernel calculates its physical Age.
    const subjectiveNow = (isDraggingNow && interaction.activeNodeId === 'now') 
        ? interaction.currentWorld.age 
        : null;
    ```

### Step 2: Suppress the Ghost Leveling Rail
The visual projector must differentiate between a level drag and a span drag, ensuring the blue leveling rail is not drawn to the 'NOW' node if the user is intending to span vertically.

*   **File:** `modules/span-graph/projection/manifest-generator.js`
*   **Action:** In the rail projection logic, ensure that the 'NOW' node is only added to the `railNodes` array of the final segment if the `liveMode` is explicitly `'level'`. The current logic likely includes it unconditionally or mishandles the condition.
*   **Code Verification/Update:** Review the block where `isLastSegment` is checked and ensure the 'NOW' node is excluded from the blue path if `isInteracting` and `liveMode === 'span'`.

## Verification & Testing
1.  **Level Drag:** Click and drag the 'NOW' node horizontally. The node should follow the mouse horizontally, and a blue level rail should extend to it. Upon release and confirmation, the node should snap perfectly to the calculated 30-degree rail at the new objective time.
2.  **Span Drag:** Click and drag the 'NOW' node vertically. A pink span line should appear. The blue level rail MUST stop at the last confirmed historical node and NOT extend diagonally to the 'NOW' node.
3.  **Span Confirmation:** Upon releasing the vertical drag and saving the span, the 'NOW' node should appear at the exact vertical position specified, terminating the new span rail, without snapping horizontally back to the 30-degree projection line of the origin point.
4.  **Birth Snap Prevention:** Reload the page or close the dialog without saving. The 'NOW' node must return to its actual calculated age based on the current world time, and under no circumstances should it pop back to the Date of Birth (Age 0) unless the character was literally just born.