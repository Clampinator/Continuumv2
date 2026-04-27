import { formatSubjectiveAge as ttlFormatAge } from '../temporal-translator/age-converter.js';

/**
 * LEGACY WRAPPER: Use temporal-translator/age-converter.js instead.
 */
export function formatSubjectiveAge(seconds) {
    return ttlFormatAge(seconds);
}
