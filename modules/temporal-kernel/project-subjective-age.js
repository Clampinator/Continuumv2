import { MS_PER_SECOND } from '../temporal-engine/constants.js';

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
    const calculatedAge = Math.max(0, (ts - off) / MS_PER_SECOND);

    return Number.isFinite(calculatedAge) ? calculatedAge : 0;
}

/**
 * TEMPORAL KERNEL: PROJECT OBJECTIVE TIME
 * Pure math: Inverse of projectSubjectiveAge.
 * Given a subjective age and a rail offset, computes the objective timestamp.
 *
 * @param {number} age - Subjective age in seconds.
 * @param {number} offset - The accumulated world clock offset (ms).
 * @returns {number} The objective timestamp (ms).
 */
export function projectObjectiveTime(age, offset) {
    const a = Number(age) || 0;
    const off = Number(offset) || 0;

    const result = off + (a * MS_PER_SECOND);

    return Number.isFinite(result) ? result : 0;
}

/**
 * TEMPORAL KERNEL: COMPUTE OFFSET FROM ARRIVAL
 * Pure math: Given a span arrival and the subjective age at departure,
 * computes the new world clock offset after the span.
 *
 * @param {number} arrivalTime - The objective arrival time (ms).
 * @param {number} age - The subjective age at the span origin (s).
 * @returns {number} The new world clock offset (ms).
 */
export function computeOffsetFromArrival(arrivalTime, age) {
    const arr = Number(arrivalTime) || 0;
    const a = Number(age) || 0;

    const result = arr - (a * MS_PER_SECOND);

    return Number.isFinite(result) ? result : 0;
}