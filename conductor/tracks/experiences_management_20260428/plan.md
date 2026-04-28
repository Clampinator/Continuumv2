# Implementation Plan: Experiences Management & Rendering

## Objective
Fix the broken span-graph experiences pipeline, eliminate legacy duplication, correct spec/code mismatches, and unify the data model with the authoritative track spec.

## Key Files
- `modules/lifeline/services/segment-generator/generate-experiences.js` (Fixed output fields, bonus)
- `modules/span-graph/projection/manifest-generator.js` (Added experience projection)
- `modules/span-graph/renderers/experience-renderer.js` (Enabled click interaction)
- `modules/lifeline/services/calculators/resonance-calculator/map-years-to-bonus.js` (Fixed thresholds)
- `modules/lifeline/services/calculators/resonance-calculator/calculate-resonance-bonuses.js` (Fixed age fallback)
- `modules/span-graph-dialog-create-experience.js` (Added description field)
- `modules/lifeline/painters/draw-experience-blocks.js` (Removed opacity duplication)

## Implementation Steps

### Phase 1: Engine & Logic [CORRECTED]
- [x] **Task: Fix generate-experiences output field names** - Changed startX/endX/startY/endY to startAge/endAge/startTime/endTime. Added isClosed and bonus fields. Added two-axis bonus calculation (Duration + Distance, cap 3). Added dual-format node accessors (_age/_time) with null guards.
- [x] **Task: Fix recency bonus thresholds** - Changed <=7yr/+2 to <=5yr/+2, <=15yr/+1 to <=10yr/+1. Updated calculate-resonance-bonuses.js to read data.age with fallback to data.eventAge.
- [x] **Task: Add description field** - Added description input to creation dialog and data model.

### Phase 2: Projection & Rendering [FIXED]
- [x] **Task: Add experience projection to manifest-generator.js** - The manifest was initializing experiences: [] but never populating it. Added world->screen coordinate transform for each experience.
- [x] **Task: Enable click interaction on experience-renderer.js** - Added data-id/data-era-id attributes, enabled pointer-events on labels, changed group pointerEvents to 'auto'.

### Phase 3: UI & Interaction [PARTIAL]
- [x] **Task: Refactor build-context-options.js** - Already done (previous commit)
- [x] **Task: Remove legacy opacity duplication** - draw-experience-blocks.js now uses seg.opacity from generateExperiences instead of recalculating
- [ ] **Task: Wire Bonuses to Dice Roller** - Partially done (calculate-resonance-bonuses.js works, setup-roll-buttons.js populates dropdown), needs end-to-end verification

## Validation Checklist
- [x] **Visual Accuracy:** Experience boxes render via span-graph manifest pipeline (projection step now functional)
- [x] **Dynamic Aging:** Forgetting opacity computed once in generateExperiences, consumed by both renderers
- [x] **Bonus Logic:** Two-axis system implemented (Duration + Distance), thresholds match spec
- [x] **Field Names:** Output uses startAge/endAge/startTime/endTime (matching spec)
- [ ] **End-to-End:** Need manual verification that experiences appear correctly in the span-graph viewport