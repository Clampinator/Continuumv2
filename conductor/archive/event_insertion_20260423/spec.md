# Specification: Historical Event Insertion

## Overview
Finalize the ability to insert Events into the character's past by clicking on any valid blue Level rail. The goal is absolute coordinate fidelity: the node must land and stay exactly where the user clicked, without "snapping" or "leaping" to incorrect positions.

## The Physical Law: ADI Precision
1.  **Physics Layer**: The insertion point (x, y) must be captured from the interaction machine with millisecond precision.
2.  **Narrative Sequence**: The `resolveNarrativeOrder` kernel must assign the correct `sort` value to bracket the new event between its neighbors.
3.  **Compensation**: The `normalizeLifelineAges` service must walk the downstream timeline to ensure all subsequent nodes stay mathematically aligned with the new insertion.

## Functional Requirements
1.  **Precise Landing**: Inserted events must use the isolated physics layer (ts, age) to bypass rounded date-string rounding.
2.  **Context Awareness**: The dialog must correctly identify the Era and Experience context based on the clicked rail segment.
3.  **Visual Continuity**: The blue rail must remain solid and correctly connected after the database update.

## Success Criteria
*   User clicks a rail.
*   Dialog opens with correct Era/Experience.
*   User saves.
*   Node appears exactly under the cursor.
*   No other nodes move or vanish.
