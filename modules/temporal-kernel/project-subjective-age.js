/**
 * TEMPORAL KERNEL: PROJECT SUBJECTIVE AGE
 * Pure math: Implements the "Diagonal Authority" (1s Age = 1000ms Time).
 * 
 * @param {number} timestamp - The objective world time (ms).
 * @param {number} offset - The accumulated world clock offset (ms).
 * @returns {number} The mathematically required Subjective Age (s).
 */
export function projectSubjectiveAge(timestamp, offset) {
    const ts = Number(timestamp) || 0;
    const off = Number(offset) || 0;
    
    // Physical Constant: Age = (Time - Offset) / 1000
    const calculatedAge = Math.max(0, (ts - off) / 1000);
    
    return Number.isFinite(calculatedAge) ? calculatedAge : 0;
}
