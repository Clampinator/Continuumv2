/**
 * TEMPORAL KERNEL: MS PER SECOND
 * The fundamental conversion constant for the Continuum physics model.
 * 1 second of Subjective Age = 1000 milliseconds of Objective Time.
 *
 * This constant is the SINGLE SOURCE OF TRUTH for time-to-age conversion.
 * All modules MUST use this instead of writing / 1000 or * 1000 inline.
 */
export const MS_PER_SECOND = 1000;