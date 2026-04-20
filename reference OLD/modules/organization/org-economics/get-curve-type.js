
import { ECONOMIC_CONFIG } from './economic-registry.js';

/**
 * Resolves the cost curve key for a specific attribute based on organization type.
 * @param {string} orgType 
 * @param {string} attrKey 
 * @returns {string}
 */
export function getCurveType(orgType, attrKey) {
    if (!orgType || !attrKey) return "standard";
    return ECONOMIC_CONFIG.typeMatrix[orgType]?.[attrKey] || "standard";
}
