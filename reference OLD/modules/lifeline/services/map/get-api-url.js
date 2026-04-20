
/**
 * Constructs the Google Maps API loader URL.
 * @param {string} apiKey - The valid API key.
 * @returns {string} The fully qualified URL.
 */
export function getApiUrl(apiKey) {
    return `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
}
