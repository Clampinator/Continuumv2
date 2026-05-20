# Implementation Plan: The "Yet" (Future Events)

## Objective
Implement the logic and visual styling for future events ("The Yet") in the Lifeline tool.

## Implementation Steps

### Phase 1: Data & Engine
- [ ] **Task: Define "The Yet" Schema in `template.json`**
    - Create a `system.theYet` collection on the actor.
- [ ] **Task: Update `getTemporalState` to integrate future nodes**
    - Logic to identify events scheduled after the current Subjective Now.
    - Ensure these nodes are flagged as `isYet: true`.
    - Ensure they are placed on the projected 1:1 diagonal rail originating from the NOW node.

### Phase 2: Projection & Rendering
- [ ] **Task: Implement "Yet" Styling in `NodeRenderer.js`**
    - Add CSS classes for ghosted nodes.
- [ ] **Task: Implement "Future Rails" in `RailRenderer.js`**
    - Draw dashed cyan lines for rail segments occurring after the NOW node.
- [ ] **Task: Handle "Fulfillment" Visuals**
    - Ensure nodes change appearance as the NOW node passes them.

### Phase 3: UI & Interaction
- [ ] **Task: Create "Schedule Yet" Dialog**
    - Allow users to input future dates and ages.
- [ ] **Task: Implement Drag-to-Future Interaction**
    - Allow dragging the NOW node into the future to create a Yet node.

## Validation Checklist
- [ ] **Visual Distinction:** Future events are clearly ghosted and rails are dashed.
- [ ] **Linear Projection:** Yet nodes sit perfectly on the 1:1 diagonal rail extending from the character's current state.
- [ ] **Dynamic Transition:** Dragging the NOW node past a Yet node causes it to become a solid historical node.
