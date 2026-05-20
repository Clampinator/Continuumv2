# Implementation Plan: Span Drawing Fix

## Objective
Correct the visual representation of Span events in the lifeline graph. When a span is created, it should draw a departure node at its physical origin, a vertical dashed line representing the jump, and an arrival node at its destination. The subsequent path segment must then originate from this new arrival point, effectively creating a new diagonal rail.

## Key Files & Context
- `modules/lifeline/painters/node-painter/update-nodes.js`
- `modules/lifeline/painters/path-painter.js`
- `modules/lifeline/services/chronology-assembler.js` (Context: Provides the `levelNodes` data structure)

## Implementation Steps

### Phase 1: Update Node Painter (`update-nodes.js`)
1.  Iterate through `graphData.levelNodes`.
2.  Use the `eventAge` and `eventTime` standard for all coordinate mapping.
3.  If `node.eventIsSpan` is true:
    *   Calculate the departure `cy` using `node.eventTime`.
    *   Draw the `span-origin` shape at `(cx, cy)`.
    *   Parse `node.eventSpanToDate` and `node.eventSpanToTime` to calculate the arrival timestamp (or use `node.arrivalTs` / `node.arrivalY` if pre-calculated by the assembler).
    *   Calculate the arrival `cy` (let's call it `arrivalCy`) using the arrival timestamp and `viewState.scaleY`.
    *   Draw the `span-dest` shape at `(cx, arrivalCy)`, ensuring the interactive node matches the location where the user dropped the handle.
4.  If it is a standard event, draw the regular `level` shape at `(cx, cy)` as it currently does.

### Phase 2: Update Path Painter (`path-painter.js`)
1.  In `drawLifeline`, modify the loop connecting `allPoints`.
2.  Keep track of the "current path origin", resolving `p1`'s starting `cy` from `p1.eventTime`.
3.  If `p1` is a span:
    *   Parse the arrival timestamp for `p1`.
    *   Draw the vertical dashed span line from `(x1, p1.eventTime)` to `(x1, arrivalTime)`.
    *   The path for the *next* segment (to `p2`) must now originate from `(x1, arrivalTime)` instead of `(x1, p1.eventTime)`. This establishes the new diagonal rail.
4.  If `p1` is a standard level event, draw the path to `p2` as normal.

## Verification & Testing
- **Visual Span Integrity:** Drag the NOW handle vertically to create a span. Verify that upon release, the pink span origin node remains on the previous rail, a dashed line shoots up/down to the exact spot the handle was released, and a pink span destination node appears there.
- **Rail Continuity:** Verify that any subsequent events added after the span correctly anchor their paths to the new arrival node, preserving the 30-degree diagonal angle from the new rail base.