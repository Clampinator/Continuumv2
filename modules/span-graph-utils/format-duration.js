import { formatSubjectiveAge } from '../temporal-translator/age-converter.js';

/**
 * LEGACY WRAPPER: Use temporal-translator/age-converter.js instead.
 */
export function formatDuration(seconds) {
    return formatSubjectiveAge(seconds);
}
