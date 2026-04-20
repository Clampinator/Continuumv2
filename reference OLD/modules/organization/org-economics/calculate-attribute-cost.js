
import { ECONOMIC_CONFIG } from './economic-registry.js';

/**
 * Calculates the total point cost to reach a level based on a curve.
 * @param {number} level 
 * @param {string} curveKey 
 * @returns {number}
 */
export function calculateAttributeCost(level, curveKey) {
    const curve = ECONOMIC_CONFIG[curveKey] || ECONOMIC_CONFIG.standard;
    const l = Math.max(0, Math.min(10, Math.floor(Number(level) || 0)));
    return curve[l] || 0;
}
