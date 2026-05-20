import { projectPointToSegment } from '/systems/continuum-v2/modules/temporal-kernel/project-point-to-segment.js';
import { interpolateWorldCoordinates } from '/systems/continuum-v2/modules/temporal-kernel/interpolate-world-coordinates.js';

/**
 * INTERACTION: CALCULATE GHOST SNAP
 * Projects a screen point onto the nearest LEVEL rail segment.
 * 
 * @param {Object} pointer - { x, y } mouse screen position.
 * @param {Array} rails - Array of rails from the RenderManifest.
 * @returns {Object|null} { screen: {x, y}, world: {age, time}, t }
 */
export function calculateGhostSnap(pointer, rails) {
    let nearest = null;
    let minDist = 20; // 20px snap threshold

    for (const rail of rails) {
        // RULE: Only snap to Level Rails (Blue), never Spans (Pink).
        if (rail.type !== 'level') continue;

        if (!rail.points || rail.points.length < 2) continue;

        for (let i = 0; i < rail.points.length - 1; i++) {
            const p1 = rail.points[i];
            const p2 = rail.points[i + 1];

            const proj = projectPointToSegment(
                pointer.x, pointer.y,
                p1.screen.x, p1.screen.y,
                p2.screen.x, p2.screen.y
            );

            if (proj.dist < minDist) {
                minDist = proj.dist;

                const interp = interpolateWorldCoordinates(
                    { age: p1.world.eventAge, time: p1.world.eventTime },
                    { age: p2.world.eventAge, time: p2.world.eventTime },
                    proj.t
                );

                nearest = {
                    screen: { x: proj.x, y: proj.y },
                    world: { eventAge: interp.age, eventTime: interp.time },
                    t: proj.t
                };
            }
        }
    }

    return nearest;
}