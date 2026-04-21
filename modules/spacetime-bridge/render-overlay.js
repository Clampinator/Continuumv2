/*
Manages the lifeline SVG overlay injected into SpaceTime's overlay container.
Redraws on map movement, zoom, and spacetime.dateChanged hook.
*/

import { getLifelineEvents } from './get-lifeline-events.js';
import { drawActorLifeline } from './draw-actor-lifeline.js';

const NS = 'http://www.w3.org/2000/svg';

let _sliderMs = null; // updated by spacetime.dateChanged hook

// Deterministic per-actor color from a fixed palette
const COLOR_PALETTE = ['#22d3ee', '#f59e0b', '#84cc16', '#f43f5e', '#a78bfa', '#fb923c'];

function colorForActor(actorId) {
    let h = 0;
    for (let i = 0; i < actorId.length; i++) h = (h * 31 + actorId.charCodeAt(i)) & 0xffffffff;
    return COLOR_PALETTE[Math.abs(h) % COLOR_PALETTE.length];
}

function getVisibleActors() {
    return game.actors.filter(a => {
        if (!['character', 'organization', 'location'].includes(a.type)) return false;
        if (!(game.user.isGM || a.isOwner)) return false;
        return a.getFlag('continuum-v2', 'spaceTimeLinked') ?? false;
    });
}

/*
Reads the SpaceTime bracket date pickers to get the visible time window.
Returns { startMs, endMs } or null if invalid.
The sliderMs comes from the spacetime.dateChanged hook stored in _sliderMs.
*/
function readBracket() {
    const startDt = document.getElementById('spacetime-start-date');
    const startTm = document.getElementById('spacetime-start-time');
    const endDt   = document.getElementById('spacetime-end-date');
    const endTm   = document.getElementById('spacetime-end-time');

    if (!startDt?.value || !endDt?.value) return null;

    const startMs = new Date(`${startDt.value}T${startTm?.value || '00:00:00'}`).getTime();
    const endMs   = new Date(`${endDt.value}T${endTm?.value   || '00:00:00'}`).getTime();
    if (isNaN(startMs) || isNaN(endMs) || startMs >= endMs) return null;

    return { startMs, endMs };
}

function ensureSvg(container) {
    let svg = container.querySelector('svg.continuum-lifeline-svg');
    if (!svg) {
        svg = document.createElementNS(NS, 'svg');
        svg.classList.add('continuum-lifeline-svg');
        Object.assign(svg.style, {
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none', overflow: 'visible'
        });
        container.appendChild(svg);
    }
    return svg;
}

function redraw(svg, map) {
    svg.innerHTML = '';

    const bracket = readBracket();
    if (!bracket || _sliderMs === null) return;
    const time = { sliderMs: _sliderMs, ...bracket };

    for (const actor of getVisibleActors()) {
        const data = getLifelineEvents(actor);
        if (data.waypoints.length === 0) continue;

        const color    = colorForActor(actor.id);
        const tokenSrc = actor.prototypeToken?.texture?.src;
        const tokenImg = (tokenSrc && tokenSrc !== actor.img)
            ? tokenSrc
            : (actor.img || 'icons/svg/mystery-man.svg');

        drawActorLifeline(
            svg, data, map,
            time.sliderMs, time.startMs, time.endMs,
            color, tokenImg, actor.id
        );
    }
}

export function setupOverlay(map, api) {
    const container = api.getOverlayContainer();
    if (!container) {
        console.error('Continuum | SpaceTime bridge: getOverlayContainer() returned null');
        return;
    }

    _sliderMs = api.getCurrentTimestamp() ?? null;

    const svg = ensureSvg(container);
    const draw = () => redraw(svg, map);

    // spacetime.dateChanged fires whenever the slider moves - provides sliderMs directly
    Hooks.on('spacetime.dateChanged', (ts) => { _sliderMs = ts; draw(); });

    // Redraw on map movement and zoom (rAF-debounced)
    let rafId = null;
    const schedule = () => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => { rafId = null; draw(); });
    };
    map.on('move', schedule);
    map.on('zoom', schedule);

    // Redraw when bracket date pickers change
    for (const id of [
        'spacetime-start-date', 'spacetime-start-time',
        'spacetime-end-date',   'spacetime-end-time'
    ]) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', draw);
    }

    draw();
}
