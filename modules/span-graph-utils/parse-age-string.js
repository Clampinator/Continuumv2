import { parseSubjectiveAge } from '../temporal-translator/age-converter.js';

/**
 * LEGACY WRAPPER: Use temporal-translator/age-converter.js instead.
 */
export function parseAgeString(str) {
    return parseSubjectiveAge(str);
}
