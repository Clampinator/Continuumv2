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
            
            const proj = projectPointToSegment(pointer, p1.screen, p2.screen);
            
            if (proj.dist < minDist) {
                minDist = proj.dist;
                
                // Interpolate world coordinates based on the projection factor 't'
                const worldAge = p1.world.eventAge + proj.t * (p2.world.eventAge - p1.world.eventAge);
                const worldTime = p1.world.eventTime + proj.t * (p2.world.eventTime - p1.world.eventTime);

                nearest = {
                    screen: proj.point,
                    world: { eventAge: worldAge, eventTime: worldTime },
                    t: proj.t
                };
            }
        }
    }

    return nearest;
}

/**
 * Pure math: Project point onto line segment.
 */
function projectPointToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return { dist: Math.hypot(p.x - v.x, p.y - v.y), t: 0, point: v };
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return { dist: Math.hypot(p.x - proj.x, p.y - proj.y), t: t, point: proj };
}
