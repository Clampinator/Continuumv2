/*
Ensures that every spaceTimeLinked actor has a SpaceTime proxy token
on the current scene. If no proxy token exists for an actor, one is
created automatically at the actor's birth location (or the map center
as a fallback). This is essential for the token-first geographic
workflow - without a proxy token, there's nothing for the player to
drag on the map.

Also handles the toggle: when an actor's spaceTimeLinked flag changes
from false to true, a proxy token is created. When it changes from
true to false, the proxy token is removed.
*/

export async function ensureProxyTokens() {
  if (!game.actors || !canvas.scene) return;

  const linked = game.actors.filter(a => {
    if (!['character', 'organization', 'location'].includes(a.type)) return false;
    return a.getFlag('continuum-v2', 'spaceTimeLinked') ?? false;
  });

  for (const actor of linked) {
    await ensureProxyTokenForActor(actor);
  }

  // Watch for spaceTimeLinked flag changes
  Hooks.on('updateActor', (actor, changes) => {
    if (!['character', 'organization', 'location'].includes(actor.type)) return;
    if (!foundry.utils.hasProperty(changes, 'flags.continuum-v2.spaceTimeLinked')) return;
    const isNowLinked = foundry.utils.getProperty(changes, 'flags.continuum-v2.spaceTimeLinked');
    if (isNowLinked) {
      ensureProxyTokenForActor(actor);
    } else {
      removeProxyTokenForActor(actor);
    }
  });
}

/*
Create a proxy token for the given actor if one does not already
exist on the current scene. The token is placed at the actor's
birth location (system.personal.birthLat/birthLng) or the map
center if no birth coordinates are available.
*/
export async function ensureProxyTokenForActor(actor) {
  if (!canvas.scene) return;

  // Check if a proxy token already exists for this actor on any scene
  for (const scene of game.scenes) {
    for (const td of scene.tokens) {
      if (td.actorId === actor.id && td.getFlag('spacetime', 'isProxy')) {
        // Token already exists - render its HTML element if SpaceTime is active
        _renderIfActive(td);
        return;
      }
    }
  }

  // Derive initial position from birth coordinates
  const personal = actor.system.personal || {};
  const lat = personal.birthLat ?? null;
  const lng = personal.birthLng ?? null;

  let latlng;
  if (lat != null && lng != null) {
    latlng = { lat: Number(lat), lng: Number(lng) };
  } else {
    // Fallback: map center
    const map = game.modules.get('spacetime')?.api?.getMap?.();
    if (map) {
      const center = map.getCenter();
      latlng = { lat: center.lat, lng: center.lng };
    } else {
      // Last resort: 0,0
      latlng = { lat: 0, lng: 0 };
    }
  }

  const tokenData = {
    actorId: actor.id,
    img: actor.img,
    name: actor.name,
    hidden: true,
    alpha: 0,
    x: -1000,
    y: -1000,
    flags: {
      spacetime: {
        isProxy: true,
        latlng: latlng,
        keyframes: [],
        manuallyPlaced: false
      }
    }
  };

  const [tokenDoc] = await canvas.scene.createEmbeddedDocuments('Token', [tokenData]);

  if (tokenDoc) {
    console.debug(
      `[Continuum Bridge] Created proxy token for ${actor.name} at`,
      `lat=${latlng.lat.toFixed(4)} lng=${latlng.lng.toFixed(4)}`
    );
    _renderIfActive(tokenDoc);
  }
}

/*
Remove all proxy tokens for the given actor across all scenes.
*/
async function removeProxyTokenForActor(actor) {
  for (const scene of game.scenes) {
    const toDelete = [];
    for (const td of scene.tokens) {
      if (td.actorId === actor.id && td.getFlag('spacetime', 'isProxy')) {
        toDelete.push(td.id);
      }
    }
    if (toDelete.length > 0) {
      await scene.deleteEmbeddedDocuments('Token', toDelete);
      console.debug(`[Continuum Bridge] Removed ${toDelete.length} proxy token(s) for ${actor.name}`);
    }
  }
}

/*
Render the HTML token element via SpaceTime's overlay manager
if the SpaceTime map is currently active.
*/
function _renderIfActive(tokenDoc) {
  // SpaceTime's HTMLOverlayManager.renderHtmlToken is the function
  // that creates the interactive HTML element on the map overlay.
  // We access it via the module's exports since it's not directly
  // on the public API.
  // The createToken hook in spacetime.js handles rendering new
  // proxy tokens automatically, but only for tokens on the active
  // canvas. For tokens created on other scenes, rendering is
  // deferred until the scene is activated (canvasReady hook).
  // Since we create tokens on canvas.scene (the active scene),
  // the createToken hook should fire and render automatically.
  // No additional work needed here.
}