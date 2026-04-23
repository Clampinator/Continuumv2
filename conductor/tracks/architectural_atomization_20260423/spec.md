# Specification: Authoritative Data Isolation (ADI) & Project Atomization

## Overview
A fundamental architectural track to resolve chronic fragility in the character lifeline. This track implements **Authoritative Data Isolation (ADI)** to separate character facts from graph physics, and **Functional Atomization** to decompose monolithic files into single-responsibility services.

## The Physical Law: ADI
1.  **Facts Layer (Record)**: Immutable strings in the character database (`date`, `time`). This layer is never overwritten by math.
2.  **Physics Layer (Node)**: Calculated projection coordinates (`x` for Age, `y` for Timestamp).
3.  **The Bridge**: Renderers consume `x/y`. Dialogs and tooltips consume `record.date/time`.

## The Structural Law: Atomization
1.  **Function-Per-File (FPF)**: Monolithic controllers like `viewport.js` and `handle-submit.js` will be split into individual files containing 1-2 functions each.
2.  **Immutability Through Isolation**: Once a function is stable and atomized, it is protected from side effects caused by edits to unrelated logic.

## Functional Requirements
1.  **Strict Property Isolation**: No property name collisions between facts and coordinates.
2.  **Unified Rendering Authority**: All 5 renderers updated to use the new `x/y` coordinate model.
3.  **Zero-Leak Dialogs**: Edit dialogs must faithfully reflect the character's database facts (strings), never real-world defaults.

## Non-Functional Requirements
-   **No Hacks**: This is a core data-model and directory-structure refactor.
-   **Stable Reverts**: Smaller files ensure more granular and safer rollbacks.
