/*
Manages the lifeline SVG overlay injected into SpaceTime's overlay container.
Redraws on map movement, zoom, spacetime.dateChanged hook, and actor updates.
All redraws are rAF-debounced to avoid redundant paints during rapid changes.

Resilient: draws segments whenever waypoints exist, even if the bracket
or slider timestamp is unavailable. The bracket controls opacity fading
only - without it, all segments render at full opacity. The clock indicator
(position of the character at the current slider time) requires sliderMs,
but trail lines between waypoints do not.
*/

import { getLifelineEvents } from './get-lifeline-events.js';
import { drawActorLifeline } from './draw-actor-lifeline.js';

const NS = 'http://www.w3.org/2000/svg';

let _sliderMs = null;
let _stApi = null;

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
Returns { startMs, endMs } or null if unavailable.
The bracket is optional for drawing - it only affects segment fading
and boundary arrows. Without it, everything renders at full opacity.
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

/*
Derive sliderMs from the SpaceTime API if the hook hasn't fired yet.
This handles the case where the overlay redraws before the first
spacetime.dateChanged event (e.g. on init or after an actor update).
*/
function _currentSliderMs() {
    if (_sliderMs !== null) return _sliderMs;
    if (_stApi?.getCurrentTimestamp) {
        const ts = _stApi.getCurrentTimestamp();
        if (ts != null) {
            _sliderMs = ts;
            return ts;
        }
    }
    return null;
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
    const sliderMs = _currentSliderMs();
    const actors = getVisibleActors();

    // Compute widest possible time range from waypoint data
    // so that fading always works even without SpaceTime bracket.
    let startMs = bracket?.startMs ?? -Infinity;
    let endMs = bracket?.endMs ?? Infinity;

    for (const actor of actors) {
        const data = getLifelineEvents(actor);
        if (data.waypoints.length === 0) continue;

        // Widen the bracket to include all waypoint times so segments
        // never get faded out when the SpaceTime bracket is unavailable
        if (!bracket && data.waypoints.length > 0) {
            const wStart = data.waypoints[0].ms;
            const wEnd = data.waypoints[data.waypoints.length - 1].ms;
            if (startMs === -Infinity || wStart < startMs) startMs = wStart;
            if (endMs === Infinity || wEnd > endMs) endMs = wEnd;
        }

        const color    = colorForActor(actor.id);
        const tokenSrc = actor.prototypeToken?.texture?.src;
        const tokenImg = (tokenSrc && tokenSrc !== actor.img)
            ? tokenSrc
            : (actor.img || 'icons/svg/mystery-man.svg');

        drawActorLifeline(
            svg, data, map,
            sliderMs, startMs, endMs,
            color, tokenImg, actor.id
        );
    }
}

export function setupOverlay(map, api) {
    _stApi = api;
    const container = api.getOverlayContainer();
    if (!container) {
        console.error('Continuum | SpaceTime bridge: getOverlayContainer() returned null');
        return;
    }

    _sliderMs = api.getCurrentTimestamp() ?? null;

    // DIAGNOSTIC: log initial state
    console.debug(
        `[Continuum Overlay] setupOverlay:`,
        `sliderMs=${_sliderMs},`,
        `container=${container ? 'ok' : 'null'}`
    );

    const svg = ensureSvg(container);
    const draw = () => redraw(svg, map);

    let rafId = null;
    const scheduleRedraw = () => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => { rafId = null; draw(); });
    };

    // spacetime.dateChanged fires whenever the slider moves
    Hooks.on('spacetime.dateChanged', (ts) => {
        _sliderMs = ts;
        scheduleRedraw();
    });

    // Redraw on map movement and zoom
    map.on('move', scheduleRedraw);
    map.on('zoom', scheduleRedraw);

    // Redraw when bracket date pickers change
    for (const id of [
        'spacetime-start-date', 'spacetime-start-time',
        'spacetime-end-date',   'spacetime-end-time'
    ]) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', scheduleRedraw);
    }

    // Redraw when actor data changes
    Hooks.on('updateActor', (actor, changes) => {
        if (!['character', 'organization', 'location'].includes(actor.type)) return;
        if (!(actor.getFlag('continuum-v2', 'spaceTimeLinked') ?? false)) return;
        scheduleRedraw();
    });
    Hooks.on('createActor', () => scheduleRedraw());

    draw();
}