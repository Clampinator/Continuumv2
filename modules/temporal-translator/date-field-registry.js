/**
 * Registry of system paths that represent date fields.
 * Used by _updateObject to know which form values need date normalization.
 * @returns {string[]} Array of path suffixes that are dates.
 */
export const DATE_FIELD_SUFFIXES = ['date', 'dob', 'when', 'inceptionDate', 'dateofbirth'];

/**
 * Tests whether a form field name refers to a date field.
 * Matches the END of the field name, replicating the original regex `$` anchor.
 * @param {string} fieldName - The form field's name attribute.
 * @returns {boolean} True if the field should be date-normalized.
 */
export function isDateField(fieldName) {
  const suffixes = DATE_FIELD_SUFFIXES;
  return suffixes.some(s => fieldName.toLowerCase().endsWith(s.toLowerCase()));
}