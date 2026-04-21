/*
SpaceTime Bridge - entry point.
Uses the spacetime.ready hook to receive the live API reference,
then wires up the lifeline overlay, location markers, and keyframe sync.
*/

import { setupOverlay } from './render-overlay.js';
import { setupLocationMarkers } from './location-markers.js';
import { setupKeyframeSync } from './write-keyframes.js';

Hooks.on('spacetime.ready', (api) => {
    const map = api.getMap();
    if (!map) {
        console.error('Continuum | SpaceTime bridge: api.getMap() returned null');
        return;
    }
    setupOverlay(map, api);
    setupLocationMarkers(map);
    setupKeyframeSync(api);
});
