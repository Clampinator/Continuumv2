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
