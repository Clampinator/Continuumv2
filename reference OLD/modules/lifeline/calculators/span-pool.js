/**
 * Specific logic for the 5-rank Span Pool.
 */
export const SpanPool = {
    /**
     * Seconds equivalent for each Span level (Years converted to seconds).
     */
    LIMITS: {
        0: 0,
        1: 31536000,
        2: 315360000,
        3: 3153600000,
        4: 31536000000,
        5: 315360000000
    },

    /**
     * Returns the maximum span capacity in seconds for a given rank.
     * @param {number} rank 
     * @returns {number}
     */
    getCapacity(rank) {
        return this.LIMITS[Number(rank) || 0] || 0;
    },

    /**
     * Determines if a pool state is Overspan.
     * @param {number} remaining 
     * @returns {boolean}
     */
    isOverspan(remaining) {
        return remaining < 0;
    }
};