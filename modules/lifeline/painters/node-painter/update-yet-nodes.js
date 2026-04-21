const svgNS = "http://www.w3.org/2000/svg";

// Visual pixel offset for neither-locked Yets so they appear ahead of Now.
// Converted to world space each frame, so it stays consistent across zoom levels.
const NEBULOUS_PIXEL_AHEAD = 80;

// Particle angles (8 directions, evenly spaced) with varying distances for variety
const PARTICLE_CONFIGS = [
    { angle: 0,        dist: 18 },
    { angle: 45,       dist: 14 },
    { angle: 90,       dist: 20 },
    { angle: 135,      dist: 13 },
    { angle: 180,      dist: 19 },
    { angle: 225,      dist: 15 },
    { angle: 270,      dist: 17 },
    { angle: 315,      dist: 12 },
];

/**
 * Renders The Yet nodes.
 *
 * Stalking rules:
 *   age-locked only  → x fixed at yet.age, y tracks now.time   (stalks Now horizontally)
 *   date-locked only → y fixed at yet.time, x tracks now.age    (stalks Now vertically)
 *   both locked      → fully static at (yet.age, yet.time)
 *   neither locked   → drifts ahead of Now with Brownian motion
 *
 * Violated (shakes red + spits particles):
 *   age-locked or both  → now.age  > yet.age
 *   date-locked only    → now.time > yet.time
 *   neither locked      → never violated (nebulous)
 */
export function updateYetNodes(group, viewState, graphData) {
    group.querySelectorAll('.graph-node-yet, .graph-yet-particle').forEach(n => n.remove());

    if (!graphData.yetNodes?.length || !graphData.nowNode) return;

    const now = graphData.nowNode;

    graphData.yetNodes.forEach(yet => {
        const { hasAge, hasDate } = yet;
        const isDragging = viewState.activeDragType === 'yet' && viewState.draggedYetId === yet.id;

        let screenX, screenY;

        if (isDragging) {
            screenX = viewState.dragCurrentX;
            screenY = viewState.dragCurrentY;
        } else if (!hasAge && !hasDate) {
            // Neither locked: float ahead of Now in world space
            const worldOffset = NEBULOUS_PIXEL_AHEAD / (viewState.scaleX || 1);
            screenX = ((now.age + worldOffset) * viewState.scaleX) + viewState.x;
            screenY = (now.time * viewState.scaleY) + viewState.y;
        } else {
            // Stalking: each axis uses its locked value if present, else tracks Now
            const worldAge  = hasAge  ? yet.age  : now.age;
            const worldTime = hasDate ? yet.time : now.time;
            screenX = (worldAge  * viewState.scaleX) + viewState.x;
            screenY = (worldTime * viewState.scaleY) + viewState.y;
        }

        if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return;

        // Violation check
        const isViolated = !yet.isFragSuppressed && (
            hasAge  ? (now.age  > yet.age)  :   // age-locked or both-locked
            hasDate ? (now.time > yet.time) :    // date-locked only
            false                                // neither locked → never violated
        );

        // --- PARTICLES (rendered first so they sit behind the node) ---
        if (isViolated) {
            const frag = yet.frag || 0;
            PARTICLE_CONFIGS.forEach((cfg, i) => {
                const rad = (cfg.angle * Math.PI) / 180;
                const tx  = Math.cos(rad) * cfg.dist;
                const ty  = Math.sin(rad) * cfg.dist;
                const dur = 0.55 + (i % 3) * 0.15;
                const delay = (i / PARTICLE_CONFIGS.length) * 0.45;
                const r   = i % 2 === 0 ? 2 : 1.5;
                const col = i % 3 === 0 ? '#ff2222' : i % 3 === 1 ? '#ff9f43' : '#ffdd00';

                const p = document.createElementNS(svgNS, 'circle');
                p.classList.add('graph-yet-particle');
                p.setAttribute('cx', screenX);
                p.setAttribute('cy', screenY);
                p.setAttribute('r', r);
                p.setAttribute('fill', col);
                p.style.setProperty('--tx',    `${tx}px`);
                p.style.setProperty('--ty',    `${ty}px`);
                p.style.setProperty('--dur',   `${Math.max(0.3, dur - frag * 0.02)}s`);
                p.style.setProperty('--delay', `${delay}s`);
                group.appendChild(p);
            });
        }

        // --- YET NODE CIRCLE ---
        const circle = document.createElementNS(svgNS, 'circle');
        circle.classList.add('graph-node-yet');
        circle.setAttribute('cx', screenX);
        circle.setAttribute('cy', screenY);
        circle.setAttribute('r', 6);
        circle.setAttribute('data-id', yet.id);
        circle.setAttribute('data-yet-desc', yet.description || '');

        if (hasAge || hasDate) {
            circle.classList.add('graph-node-yet-locked');
        } else {
            circle.classList.add('graph-node-yet-drifting');
        }

        if (isViolated) {
            circle.classList.add('graph-node-yet-violated');
            const amp = Math.min(12, 4 + (yet.frag || 0) * 1.5);
            const dur = Math.max(0.12, 0.35 - (yet.frag || 0) * 0.02);
            circle.style.setProperty('--yet-shake-amp', amp);
            circle.style.setProperty('--yet-shake-dur', `${dur}s`);
        }

        group.appendChild(circle);
    });
}
