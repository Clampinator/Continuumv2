
/**
 * Checks if the Google Maps API key is present in Foundry settings.
 * @returns {string|null} The trimmed API key if valid, null otherwise.
 */
export function validateApiConfig() {
    const apiKey = game.settings.get('continuum-v2', 'googleMapsApiKey_v3')?.trim();
    if (!apiKey || apiKey === "") {
        return null;
    }
    return apiKey;
}
