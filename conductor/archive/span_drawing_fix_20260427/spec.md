# Specification: Span Drawing Fix

## Problem
Span events are currently drawn as single points on the existing rail. This contradicts the physical reality of a span, which is a vertical jump in objective time that establishes a new subjective age baseline (a new rail).

## Requirements
1.  **Dual Node Rendering**: A single Span event record must generate two visual nodes:
    *   **Departure**: At the point on the previous rail where the span began.
    *   **Arrival**: At the point in objective time where the span landed.
2.  **Vertical Discontinuity**: A dashed line must connect the departure and arrival points.
3.  **Rail Propagation**: All subsequent events must anchor their 1:1 diagonal paths to the span's *arrival* point.
4.  **Property Standard**: Use `eventAge` (Subjective Age in seconds) and `eventTime` (Objective Timestamp in ms) for all coordinate math.

## UI/UX Goals
*   The interactive "handle" during a span drag should accurately preview the arrival point.
*   The final rendered state must match the previewed arrival point.
*   Span nodes should use the `span-origin` and `span-dest` CSS classes for distinct styling.
