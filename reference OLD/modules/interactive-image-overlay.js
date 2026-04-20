import { initializeOverlaySystem } from './interactive-image-overlay/initialize-overlay-system.js';

/**
 * Interactive Image Overlay Module
 * Refactored into Atomic Units per the ALF Protocol.
 * 
 * Logic flow:
 * 1. Wait for Google Maps API.
 * 2. Define custom Overlay class.
 * 3. Listen for keyframe show requests.
 */
initializeOverlaySystem().catch(err => {
    console.debug("Continuum | Interactive Overlay load status:", err);
});