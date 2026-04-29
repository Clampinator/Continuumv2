# Implementation Plan: UI/UX Fidelity & Readability Audit

## Objective
Audit and enhance the visual and functional quality of the Lifeline UI.

## Implementation Steps

### Phase 1: Visual Audit
- [ ] **Task: Improve Label Placement**
    - Refactor `manifest-generator.js` to detect and offset overlapping labels.
- [ ] **Task: Enhance Node Visibility**
    - Update `NodeRenderer.js` to add distinct borders or glow effects to significant nodes (e.g., Spans, NOW).

### Phase 2: Tooltip & Info Density
- [ ] **Task: Refactor Tooltip Manager**
    - Update `tooltips.js` to support multi-line, categorized information.
- [ ] **Task: Implement Era-Colored Rails**
    - Allow rail segments to change color or intensity based on the active Era (optional).

### Phase 3: Usability
- [ ] **Task: Enhance Spreadsheet Layout**
    - Update `lifeline-spreadsheet.hbs` with better spacing and clearer headers.
- [ ] **Task: Add Filter/Search to Spreadsheet**
    - Implement a simple real-time filter for event titles and locations.

## Validation Checklist
- [ ] **Clarity:** Even with 50 events in a small window, no titles are unreadable due to overlap.
- [ ] **Efficiency:** Tooltips provide all necessary information at a glance without cluttering the graph.
- [ ] **Performance:** The overlap detection algorithm does not cause noticeable lag during panning/zooming.
