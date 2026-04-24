/**
 * STATE: RESOLVE RECORD PATH
 * Determines the nested system path for a history record.
 * 
 * @param {string} recordId - The ID of the record.
 * @param {string} eraId - The target Era ID.
 * @param {string} expId - The target Experience ID (optional).
 * @returns {string} The full system path (e.g., 'system.eras.ID.events.ID').
 */
export function resolveRecordPath(recordId, eraId, expId = null) {
    if (!recordId || !eraId) return null;
    
    if (expId && expId !== 'null') {
        return `system.eras.${eraId}.experiences.${expId}.events.${recordId}`;
    }
    
    return `system.eras.${eraId}.events.${recordId}`;
}
