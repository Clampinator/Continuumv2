
import { validateApiConfig } from './validate-api-config.js';
import { reportApiError } from './report-api-error.js';
import { getApiUrl } from './get-api-url.js';
import { injectScriptTag } from './inject-script-tag.js';
import { handleAuthFailure } from './handle-auth-failure.js';

/**
 * Orchestrates the loading of Google Maps.
 * Ensures the API is only loaded once and handles configuration errors.
 * @returns {Promise<void>}
 */
export async function loadApi() {
    // 1. Return early if already loaded
    if (window.google?.maps) {
        if (window._resolveGoogleMapsApi) window._resolveGoogleMapsApi();
        return;
    }

    // 2. Validate Configuration
    const apiKey = validateApiConfig();
    if (!apiKey) {
        reportApiError("No Google Maps API Key found in System Settings. Please enter your key to enable the Lifeline map.");
        throw new Error("Missing API Key");
    }

    // 3. Register Auth failure listener before injection
    handleAuthFailure();

    // 4. Check if injection is already in progress
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
        return window.googleMapsPromise;
    }

    // 5. Inject script
    const url = getApiUrl(apiKey);
    try {
        await injectScriptTag(url);
        // Resolve the global promise mechanism used by the system
        if (window._resolveGoogleMapsApi) window._resolveGoogleMapsApi();
    } catch (err) {
        reportApiError(err.message);
        throw err;
    }
}
