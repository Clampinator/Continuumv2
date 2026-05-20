/*
Keyframe sync: writes Lifeline event coordinates to SpaceTime token keyframes.
Each actor's located events become keyframes; SpaceTime interpolates the
token position on the world map as the slider moves.

Writes keyframes to ALL tokens for spaceTimeLinked actors on any scene.
The previous guard (requiring existing flags.spacetime) created a
chicken-and-egg: no keyframes were written unless SpaceTime had already
set the flag, but the flag is only set when SpaceTime recognizes a token.
Now we proactively write keyframes; SpaceTime reads them when present.
*/

import { getLifelineEvents } from './get-lifeline-events.js';

function _toKeyframes(actor) {
    const { waypoints } = getLifelineEvents(actor);
    return waypoints.map((wp, i) => ({
        id: `${actor.id}:${i}`,
        timestamp: wp.ms,
        lat: Number(wp.lat),
        lng: Number(wp.lng),
        actorId: actor.id
    }));
}

async function _syncActor(actor) {
    if (!['character', 'organization', 'location'].includes(actor.type)) return;
    if (!(actor.getFlag('continuum-v2', 'spaceTimeLinked') ?? false)) return;
    const frames = _toKeyframes(actor);

    console.debug(
        `[Continuum Bridge] _syncActor(${actor.name}):`,
        `${frames.length} keyframes`,
        frames.length > 0 ? `ts=${frames[0].timestamp} lat=${frames[0].lat} lng=${frames[0].lng}` : ''
    );

    if (!frames.length) return;

    let written = 0;
    for (const scene of game.scenes) {
        for (const tokenDoc of scene.tokens) {
            if (tokenDoc.actorId !== actor.id) continue;
            // Write keyframes to ALL tokens for this actor, regardless
            // of whether SpaceTime has already set flags. SpaceTime will
            // read flags.spacetime.keyframes when it finds them.
            try {
                await tokenDoc.setFlag('spacetime', 'keyframes', frames);
                written++;
            } catch (e) {
                // setFlag fails if the token doc doesn't support the scope
                // (e.g. the module isn't installed). Non-fatal.
                console.debug(
                    `[Continuum Bridge] setFlag failed for token ${tokenDoc.id}:`,
                    e.message
                );
            }
        }
    }

    if (written === 0) {
        console.debug(
            `[Continuum Bridge] _syncActor(${actor.name}): no tokens found on any scene`
        );
    }
}

async function _syncAll() {
    if (!game.actors || !game.scenes) return;
    for (const actor of game.actors) {
        if (!game.user.isGM && !actor.isOwner) continue;
        await _syncActor(actor);
    }
}

export function setupKeyframeSync() {
    _syncAll();
    Hooks.on('updateActor', (actor) => _syncActor(actor));
    Hooks.on('createActor', (actor) => _syncActor(actor));
    Hooks.on('canvasReady',  () => _syncAll());
}

/*
Writes a single keyframe immediately to all tokens for the actor.
Used when the user pins their location via the token-location button.
*/
export async function writeImmediateKeyframe(actor, timestampMs, lat, lng) {
    if (!actor || timestampMs == null || lat == null || lng == null) return;
    if (!(actor.getFlag('continuum-v2', 'spaceTimeLinked') ?? false)) return;
    for (const scene of game.scenes) {
        for (const tokenDoc of scene.tokens) {
            if (tokenDoc.actorId !== actor.id) continue;
            const existing = tokenDoc.getFlag('spacetime', 'keyframes') ?? [];
            const id = `${actor.id}:immediate`;
            const without = existing.filter(kf => kf.id !== id);
            try {
                await tokenDoc.setFlag('spacetime', 'keyframes', [
                    ...without,
                    { id, timestamp: timestampMs, lat: Number(lat), lng: Number(lng), actorId: actor.id }
                ]);
            } catch (e) {
                console.debug(`[Continuum Bridge] writeImmediateKeyframe setFlag failed:`, e.message);
            }
        }
    }
}