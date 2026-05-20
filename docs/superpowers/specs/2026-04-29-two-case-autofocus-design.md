# Two-Case Autofocus Design

## Summary

When a character sheet opens the Lifeline section, the viewport autofocus should behave differently depending on how many history nodes exist:

1. **Birth-only characters** (only birth + NOW nodes): NOW in the lower-left quadrant (current behavior)
2. **Characters with history** (birth + other nodes + NOW): Center the full content in the viewport with appropriate zoom

## Current Behavior

`handle-autofocus.js` runs once on viewport construction (150ms delay). It always:
- Positions NOW at screen coordinates (25% width, 75% height)
- Uses a fixed zoom of `0.00000005`
- Ignores all other nodes

## Proposed Behavior

### Case 1: Birth-only (only birth + NOW)

Unchanged from current behavior:
- NOW at 25% X, 75% Y (lower-left quadrant)
- Fixed zoom `0.00000005`
- This zoom level shows an entire human lifespan in the viewport

### Case 2: Has other history nodes

- Calculate bounding box of all render nodes (including NOW)
- Center the midpoint of that bounding box on screen (50% X, 50% Y)
- Calculate zoom to fit all content with 15% padding on each side
- Floor zoom at `0.00000005` (the birth-only zoom) so very short lifelines don't zoom in too far

### How to detect which case

Count nodes in `state.nodes` (the physical render nodes from `getTemporalState`, not the raw history facts). If `state.nodes` has only `birth` and `now` (length <= 2), it's Case 1. Otherwise, Case 2.

## File Changes

### `modules/span-graph/viewport/actions/handle-autofocus.js`

Add a branch to `calculateAutofocus()`:

```
calculateAutofocus():
  1. Get history, run through temporal state (existing code)
  2. Get container dimensions (existing code)
  3. Count real history nodes (nodes that are not birth and not NOW)
  4. IF only birth + NOW (nodes.length <= 2):
       - Case 1: current behavior unchanged
  5. ELSE:
       - Find bounding box: minX/maxX and minY/maxY of all nodes
       - Calculate midpoint: ((minX+maxX)/2, (minY+maxY)/2)
       - Calculate zoom to fit bbox with 15% padding:
         - zoomX = (rect.width * 0.70) / (maxX - minX)  [0.70 = 1 - 2*0.15]
         - zoomY = (rect.height * 0.70) / ((maxY - minY) * |TARGET_RATIO|)
         - finalZoom = min(zoomX, zoomY)
         - Floor: finalZoom = max(finalZoom, 0.00000005)
       - Center midpoint on screen:
         - panX = (rect.width / 2) - (midpointX * finalZoom)
         - panY = (rect.height / 2) - (midpointY * TARGET_RATIO * finalZoom)
  6. Return { zoom, panX, panY, initialized: true }
```

### Tests

Add `tests/span-graph/autofocus.test.js`:

- **Case 1 (birth-only)**: Mock temporal state with only birth + NOW, verify NOW is at lower-left quadrant at fixed zoom
- **Case 2 (nodes present)**: Mock temporal state with birth + event + NOW, verify midpoint is centered and zoom fits content
- **Zoom floor**: Multi-node case where computed zoom would be smaller than `0.00000005`, verify it floors to that value
- **Single-node edge case**: Only birth node (no NOW yet), should not crash, should default to Case 1 behavior
- **Container zero-size**: Verify returns null (existing guard)
- **Round-trip**: After autofocus, verify worldToScreen on bounding box corners falls within viewport bounds with padding

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Center point for multi-node | Midpoint of bounding box | Simpler than centroid, always shows full lifeline |
| Padding | 15% on each side | Standard margin, prevents content touching edges |
| Zoom floor | `0.00000005` | Same as birth-only zoom, prevents absurd zoom on tiny lifelines |
| Detection method | Count nodes in state | Direct, unambiguous, uses existing data |
| Y-axis scaling | Use TARGET_RATIO | Consistent with worldToScreen coordinate system |