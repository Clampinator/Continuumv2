
import { reportApiError } from './report-api-error.js';

/**
 * Registers the global window handler for Google Maps authentication failures.
 */
export function handleAuthFailure() {
    window.gm_authFailure = () => {
        reportApiError("Authentication Failed. Your API key might be invalid, or billing is not enabled on your Google Cloud Project.");
        
        // Cleanup attempt to allow retry without page refresh if key is fixed
        const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
        if (existingScript) existingScript.remove();
        if (window.google) {
            try { delete window.google; } catch(e) { window.google = undefined; }
        }
    };
}
