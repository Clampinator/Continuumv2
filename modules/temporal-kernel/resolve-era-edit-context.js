/*
resolve-era-edit-context.js
KERNEL: Prepares era data for the edit dialog.
Pure function - no side effects, no Foundry API calls.

@param {Object} eras - Raw era object from actor.system.eras
@param {string} eraId - The ID of the era to edit
@returns {Object|null} Era data for the edit dialog, or null if not found
*/
export function resolveEraEditContext(eras, eraId) {
  if (!eras || !eraId || !eras[eraId]) return null;

  const era = eras[eraId];
  return {
    id: eraId,
    name: era.name || 'Untitled',
    dateFrom: era.dateFrom || '',
    dateTo: era.dateTo || '',
    age: era.age || 0,
    sort: era.sort || 0,
    experiences: era.experiences || {}
  };
}