/*
Keyframe sync: writes Lifeline event coordinates to SpaceTime token keyframes.
Each actor's located events become keyframes; SpaceTime interpolates the
token position on the world map as the slider moves.

Only tokens that already carry spacetime flags are updated - these are the
proxy tokens the user has placed on the SpaceTime scene.
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
    if (!frames.length) return;

    for (const scene of game.scenes) {
        for (const tokenDoc of scene.tokens) {
            if (tokenDoc.actorId !== actor.id) continue;
            if (!tokenDoc.flags?.spacetime) continue;
            await tokenDoc.setFlag('spacetime', 'keyframes', frames);
        }
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
Writes a single keyframe immediately to all SpaceTime-linked tokens for the actor.
Used when the user pins their location via the token-location button on a dialog.
The full sync (via updateActor) will rebuild all keyframes when the dialog saves;
this write gives SpaceTime a preview keyframe right away.
*/
export async function writeImmediateKeyframe(actor, timestampMs, lat, lng) {
    if (!actor || timestampMs == null || lat == null || lng == null) return;
    if (!(actor.getFlag('continuum-v2', 'spaceTimeLinked') ?? false)) return;
    for (const scene of game.scenes) {
        for (const tokenDoc of scene.tokens) {
            if (tokenDoc.actorId !== actor.id) continue;
            if (!tokenDoc.flags?.spacetime) continue;
            const existing = tokenDoc.getFlag('spacetime', 'keyframes') ?? [];
            const id = `${actor.id}:immediate`;
            const without = existing.filter(kf => kf.id !== id);
            await tokenDoc.setFlag('spacetime', 'keyframes', [
                ...without,
                { id, timestamp: timestampMs, lat: Number(lat), lng: Number(lng), actorId: actor.id }
            ]);
        }
    }
}
