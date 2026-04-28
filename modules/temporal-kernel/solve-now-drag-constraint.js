import { TARGET_RATIO } from '../temporal-engine/constants.js';

/**
 * TEMPORAL KERNEL: SOLVE NOW DRAG CONSTRAINT
 * Enforces the "Three-Direction Law" and lore Vetoes.
 */
export function solveNowDragConstraint(current, start, startWorld, screenToWorld, context = {}) {
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 5) return { world: { ...startWorld }, mode: null };

    // 1. Ray Definitions
    const visualLevelingSlope = 1000 * TARGET_RATIO;
    const rays = [
        { mode: 'span', dir: { x: 0, y: -1 } }, // Up
        { mode: 'span', dir: { x: 0, y: 1 } },  // Down
        { mode: 'level', dir: { x: 1, y: visualLevelingSlope } } // 30-deg
    ];

    // 2. Find Nearest Ray
    let best = { mode: null, dist: Infinity };
    for (const ray of rays) {
        const d = distToRay(current, start, ray.dir);
        if (d < best.dist) {
            best = { mode: ray.mode, dist: d };
        }
    }

    // 3. PHYSICAL VETO: Block Spanning if illegal
    let finalMode = best.mode;
    
    // Check Rank Gate and Level Breath
    const isRankBlocked = (context.spanRank || 0) < 1;
    const isBreathBlocked = Boolean(context.lastEvent?.record?.eventIsSpan);

    if (finalMode === 'span' && (isRankBlocked || isBreathBlocked)) {
        // Character is physically incapable of spanning. 
        // Force them onto the Leveling Ray instead.
        finalMode = 'level';
    }

    // 4. Project World Coordinates
    const rawWorld = screenToWorld(current.x, current.y);
    
    if (finalMode === 'span') {
        return {
            world: { eventAge: startWorld.eventAge, eventTime: rawWorld.eventTime },
            mode: 'span'
        };
    }

    // Diagonal Leveling
    const dAge = Math.max(0, rawWorld.eventAge - startWorld.eventAge);
    return {
        world: {
            eventAge: startWorld.eventAge + dAge,
            eventTime: startWorld.eventTime + (dAge * 1000)
        },
        mode: 'level'
    };
}

function distToRay(p, origin, dir) {
    const mag = Math.hypot(dir.x, dir.y);
    const u = { x: dir.x / mag, y: dir.y / mag };
    const v = { x: p.x - origin.x, y: p.y - origin.y };
    const dot = v.x * u.x + v.y * u.y;
    if (dot <= 0) return Infinity;
    const proj = { x: origin.x + u.x * dot, y: origin.y + u.y * dot };
    return Math.hypot(p.x - proj.x, p.y - proj.y);
}
