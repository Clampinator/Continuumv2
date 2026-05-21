/**
 * Converts a fraternity name to a CSS-safe class name.
 * "Money Changers" -> "money-changers", "Foxhorn" -> "foxhorn".
 * This is a presentation utility, not a game rule.
 * @param {string} fraternityName - The fraternity name from system data.
 * @returns {string} CSS-safe class string.
 */
export function cssClassFromFraternity(fraternityName) {
  // Trim whitespace-only to avoid generating a class from pure spaces
  const trimmed = (fraternityName || '').trim();
  if (!trimmed) return 'default-fraternity';
  return trimmed.toLowerCase().replace(/\s+/g, '-');
}