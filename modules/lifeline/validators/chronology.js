/**
 * Logic for detecting "Frag" and chronological errors.
 */
export const Chronology = {
    /**
     * Returns true if the moment happens before the relative "history" cursor.
     * @param {number} currentTimeTs 
     * @param {number} lastTimeTs 
     * @param {boolean} isSpan 
     * @returns {boolean}
     */
    isChronologicalError(currentTimeTs, lastTimeTs, isSpan) {
        if (isSpan) return false;
        if (!currentTimeTs || !lastTimeTs) return false;
        return currentTimeTs < lastTimeTs;
    }
};
