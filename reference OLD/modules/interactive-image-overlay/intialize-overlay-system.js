import { constructOverlayClass } from './construct-overlay-class.js';
import { handleMapRenderRequest } from './handle-map-render-request.js';

let overlayClassCache = null;

/**
 * Bootstraps the interactive image overlay system by awaiting API availability and registering hooks.
 */
export async function initializeOverlaySystem() {
    // Ensure the promise exists (safety if initialized independently)
    if (!window.googleMapsPromise) {
        window.googleMapsPromise = new Promise(resolve => {
            window._resolveGoogleMapsApi = resolve;
        });
    }

    // 2. Wait for the API to be ready
    await window.googleMapsPromise;

    // 3. Initialize Class Definition if not already done
    if (!overlayClassCache) {
        overlayClassCache = constructOverlayClass();
    }
    
    // 4. Register Hooks for visual updates
    Hooks.on('continuum.showKeyframeOnMap', (data) => {
        handleMapRenderRequest(data, overlayClassCache);
    });
}