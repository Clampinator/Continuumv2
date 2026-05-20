# Specification: Historical Data Integrity & Coordinate Isolation

## Overview
A high-fidelity architectural track to resolve the real-world date leak in the node edit dialog. The core issue is that the system currently overwrites historical date/time strings with numeric physics coordinates. This track will implement **Full Property Isolation** to separate character facts from graph geometry.

## The Physical Law: Coordinate Isolation
1.  **Facts Layer**: `.date` and `.time` properties in the database must always remain as the literal strings provided by the user.
2.  **Physics Layer**: A new `.ts` (timestamp) property will be the absolute authority for all Y-axis coordinate math.

## Functional Requirements

1.  **Atomic Rendering Synchronization**:
    *   The entire temporal engine and all 5 renderers must be updated in a single pass to use the new `.ts` authority.
    *   **Goal**: Ensure zero downtime for blue (Level) and pink (Span) rendering lines.

2.  **Authoritative Dialog Integrity**:
    *   `getTemplateData` must map the preserved date/time strings directly to the dialog fields.
    *   The system must never "guess" a date or fallback to the real-world `Date.now()`.

3.  **High-Precision Persistence**:
    *   `handleSubmit` must correctly record both the high-precision `.ts` coordinate and the corresponding objective strings.

## Non-Functional Requirements
-   **No Hacks**: This is a core data-model refactor.
-   **Zero Regression**: Existing node positions must remain stable.
-   **Legacy Compatibility**: Intelligent recovery of Age for nodes missing high-precision data.
