/**
 * Ensures the nested system.personal.name matches the document-level name.
 * This is a DB invariant: the two must always be identical after form submission.
 * @param {object} formData - The flat form data object from _updateObject.
 * @returns {object} The same formData object, with system.personal.name synced.
 */
export function syncActorName(formData) {
  if (formData.name) {
    formData['system.personal.name'] = formData.name;
  }
  return formData;
}