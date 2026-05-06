/**
 * Temporal constants for the Continuum system.
 * The core "Functional Contract" is 1 second of Subjective Age = 1000ms of Objective Time.
 */

export const MS_PER_SECOND = 1000;

export const SECONDS_IN_MINUTE = 60;
export const SECONDS_IN_HOUR = 3600;
export const SECONDS_IN_DAY = 86400;
export const SECONDS_IN_YEAR = 31536000; // 365 days
export const SECONDS_IN_YEAR_STRICT = 31557600; // 365.25 days (precision)

/**
 * The target visual ratio for the Lifeline graph.
 * This ratio balances X (Age in seconds) and Y (Time in ms) to achieve a 30-degree visual sweep.
 * tan(30) ≈ 0.57735.
 * Since 1s Age = 1000ms Time, and Y increases downward in SVG,
 * we use -0.00057735 to make Time move "Up" at 30 degrees.
 */
export const MS_IN_YEAR = SECONDS_IN_YEAR * MS_PER_SECOND;
export const MS_IN_DAY = SECONDS_IN_DAY * MS_PER_SECOND;

export const TARGET_RATIO = -0.00057735;

// UX GUARD: Minimum drag displacement (ms) to open the span dialog.
// Prevents accidental clicks from triggering insertion. This is NOT a physics rule -
// sub-minute spans are physically valid. The physics layer rejects zero-displacement
// spans separately in validateSpanPhysics.
export const MIN_DRAG_DISPLACEMENT_MS = 60000;

// PHYSICS: Minimum departure delta (ms) for arrival adjustment on span edits.
// When editing a span, TTL round-trip can introduce micro-drift (timezone rounding,
// seconds truncation) that makes the departure timestamp shift by a few ms even
// when the user didn't change the date. If this noise delta is applied to arrivalTs
// via adjustSpanOnDepartureEdit, the compensation wave propagates the shift through
// every downstream node. Values below this threshold are treated as TTL noise and
// ignored. The user's explicit departure change will always exceed 1 second.
export const MIN_DEPARTURE_DELTA_MS = 1000;
