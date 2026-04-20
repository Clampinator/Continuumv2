/**
 * Temporal constants for the Continuum system.
 * The core "Functional Contract" is 1 second of Subjective Age = 1000ms of Objective Time.
 */

export const MS_PER_SECOND = 1000;

export const SECONDS_IN_MINUTE = 60;
export const SECONDS_IN_HOUR = 3600;
export const SECONDS_IN_DAY = 86400;
export const SECONDS_IN_YEAR = 31536000; // 365 days

/**
 * The target visual ratio for the Lifeline graph.
 * This ratio balances X (Age in seconds) and Y (Time in ms) to achieve a ~30-degree visual sweep.
 * tan(30) ≈ 0.577. 
 * Since 1s Age = 1000ms Time, a 1:1 physical ratio would be extremely steep visually.
 * TARGET_RATIO ≈ -0.00045 (negative because Y-axis in SVG usually grows downward, 
 * but we want time to move "up" or at least follow a specific convention).
 */
export const TARGET_RATIO = -0.00045;
