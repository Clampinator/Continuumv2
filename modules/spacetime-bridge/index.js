/*
SpaceTime Bridge - entry point.
Uses the spacetime.ready hook to receive the live API reference,
then wires up proxy token creation, lifeline overlay, location
markers, keyframe sync, and token-first event assignment.

On init:
1. Ensures proxy tokens exist for all spaceTimeLinked actors
2. Geocodes any events with location text but no coordinates
3. Sets up rendering, markers, and keyframe sync
*/

import { setupOverlay } from './render-overlay.js';
import { setupLocationMarkers } from './location-markers.js';
import { setupKeyframeSync } from './write-keyframes.js';
import { getTokenContextMenuItems, updateEventFromToken } from './assign-token-location.js';
import { geocodeMissingCoordinates } from './startup-geocode.js';
import { ensureProxyTokens } from './ensure-proxy-tokens.js';

// Register the token context menu hook immediately - does not depend on map instance.
// The hook receives a mutable array; we push our menu items into it.
Hooks.on('spacetime.tokenContextMenu', (items, tokenDoc) => {
  const menuItems = getTokenContextMenuItems(tokenDoc);
  for (const item of menuItems) items.push(item);
});

Hooks.on('spacetime.ready', async (api) => {
    const map = api.getMap();
    if (!map) {
        console.error('Continuum | SpaceTime bridge: api.getMap() returned null');
        return;
    }

    // Create proxy tokens for spaceTimeLinked actors that don't have one.
    // Must run before keyframe sync so tokens exist when keyframes are written.
    await ensureProxyTokens();

    // Geocode any missing coordinates before setting up rendering.
    // This ensures the overlay and keyframes have lat/lng for all
    // events that have location text, including previously-created
    // events that predate the auto-geocode enrichment.
    await geocodeMissingCoordinates();

    setupOverlay(map, api);
    setupLocationMarkers(map, updateEventFromToken);
    setupKeyframeSync(api);
});