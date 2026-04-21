/**
 * Pure math utilities for time conversions in the Lifeline.
 * Isolated from Foundry and Actor data structures.
 */
export const TimeEngine = {
    /**
     * Calculates duration between two calendar points in seconds.
     * @param {string} fromDate 
     * @param {string} fromTime 
     * @param {string} toDate 
     * @param {string} toTime 
     * @returns {number}
     */
    getDuration(fromDate, fromTime, toDate, toTime) {
        if (!fromDate || !toDate) return 0;
        try {
            const fTime = fromTime || '00:00';
            const tTime = toTime || '00:00';
            const from = new Date(`${fromDate}T${fTime}`).getTime();
            const to = new Date(`${toDate}T${tTime}`).getTime();
            if (isNaN(from) || isNaN(to)) return 0;
            return Math.floor((to - from) / 1000);
        } catch (e) {
            return 0;
        }
    },

    /**
     * Converts absolute timestamp to subjective age in seconds.
     * @param {number} timestamp 
     * @param {number} dobTimestamp 
     * @returns {number}
     */
    getAgeSeconds(timestamp, dobTimestamp) {
        if (!timestamp || !dobTimestamp) return 0;
        return Math.max(0, (timestamp - dobTimestamp) / 1000);
    }
};
