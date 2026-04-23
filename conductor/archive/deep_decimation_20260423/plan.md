# Implementation Plan: Deep Decimation

## Phase 1: Kernel Extraction (The Laws of Physics)
- [x] **Task: Extract Diagonal Math** (Done - project-diagonal.js)
- [x] **Task: Extract Sort Logic** (Done - resolve-narrative-order.js)
- [x] **Task: Extract Span Rules** (Done - validate-span-physics.js)

## Phase 2: Projection & The Manifest (The Brain)
- [x] **Task: Build the Projection Engine** (Done - manifest-generator.js)
- [ ] **Task: Integrate Manifest into Viewport** (Next)

## Phase 3: Renderer Decimation (The Pipes)
- [ ] **Task: Refactor to Dumb Rendering**
    - Update all 5 renderers to consume ONLY the Manifest.
    - Remove all `flattenEvents` or `getTemporalState` calls from the rendering loop.

## Phase 4: Interaction Splitting
- [ ] **Task: Decompose Pointer Movements**
    - Split `on-pointer-move.js` into atomic handlers for Pan, NodeDrag, and SpanDrag.
