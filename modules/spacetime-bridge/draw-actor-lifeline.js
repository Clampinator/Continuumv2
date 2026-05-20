/*
Draws a single actor's lifeline SVG elements onto the SpaceTime overlay.
Called once per actor per redraw cycle.
*/

const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
}

function formatDate(ms) {
    return new Date(ms).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

/*
Interpolate geographic position at the given sliderMs.
Returns MapLibre {x, y} pixel point, or null if no waypoints.
*/
function interpolatePosition(waypoints, sliderMs, map) {
    if (waypoints.length === 0) return null;
    const first = waypoints[0];
    const last  = waypoints[waypoints.length - 1];

    if (sliderMs <= first.ms) return map.project([first.lng, first.lat]);
    if (sliderMs >= last.ms)  return map.project([last.lng,  last.lat]);

    for (let i = 0; i < waypoints.length - 1; i++) {
        const a = waypoints[i];
        const b = waypoints[i + 1];
        if (sliderMs >= a.ms && sliderMs <= b.ms) {
            const t = (sliderMs - a.ms) / (b.ms - a.ms);
            const lng = a.lng + t * (b.lng - a.lng);
            const lat = a.lat + t * (b.lat - a.lat);
            return map.project([lng, lat]);
        }
    }
    return null;
}

function drawSegment(g, seg, map, color, startMs, endMs) {
    const from = map.project([seg.fromLng, seg.fromLat]);
    const to   = map.project([seg.toLng,   seg.toLat]);
    const line = el('line', {
        x1: from.x, y1: from.y,
        x2: to.x,   y2: to.y,
        stroke: color,
        'stroke-width': 2,
        'stroke-linecap': 'round'
    });
    if (seg.type === 'dashed') line.setAttribute('stroke-dasharray', '8 4');
    if (seg.type === 'dotted') line.setAttribute('stroke-dasharray', '2 5');
    // Fade segments outside the timeline bracket
    if (seg.toMs < startMs || seg.fromMs > endMs) line.setAttribute('opacity', '0.25');
    g.appendChild(line);
}

/*
Draws the clock indicator: circular token image + date label.
The image is clipped to a circle using a per-actor clipPath stored in svg <defs>.
*/
function drawClock(svg, g, px, sliderMs, tokenImg, actorId, color) {
    const r  = 16;
    const cx = Math.round(px.x);
    const cy = Math.round(px.y);
    const clipId = `continuum-lifeline-clip-${actorId}`;

    // Register clipPath in svg <defs> - circle placed at the actual screen position
    let defs = svg.querySelector('defs');
    if (!defs) { defs = el('defs', {}); svg.insertBefore(defs, svg.firstChild); }
    if (!defs.querySelector(`#${clipId}`)) {
        const clip = el('clipPath', { id: clipId });
        clip.appendChild(el('circle', { cx, cy, r }));
        defs.appendChild(clip);
    }

    // Colored ring behind image
    g.appendChild(el('circle', {
        cx, cy, r: r + 2,
        fill: 'none', stroke: color, 'stroke-width': 2
    }));

    // Token image clipped to circle
    g.appendChild(el('image', {
        href: tokenImg || 'icons/svg/mystery-man.svg',
        x: cx - r, y: cy - r,
        width: r * 2, height: r * 2,
        'clip-path': `url(#${clipId})`,
        preserveAspectRatio: 'xMidYMid slice'
    }));

    // Date label above clock
    const label = el('text', {
        x: cx, y: cy - r - 6,
        'text-anchor': 'middle',
        fill: color,
        'font-size': '11',
        'font-family': 'sans-serif',
        'paint-order': 'stroke',
        stroke: '#000',
        'stroke-width': 3,
        'stroke-linejoin': 'round'
    });
    label.textContent = formatDate(sliderMs);
    g.appendChild(label);
}

// Arrow pointing up (future) or down (past)
function drawArrow(g, px, direction, color) {
    const size = 8;
    const x = Math.round(px.x);
    const y = Math.round(px.y);
    let d;
    if (direction === 'after') {
        d = `M ${x} ${y - size} L ${x + size} ${y + size} L ${x - size} ${y + size} Z`;
    } else {
        d = `M ${x} ${y + size} L ${x + size} ${y - size} L ${x - size} ${y - size} Z`;
    }
    g.appendChild(el('path', { d, fill: color, opacity: '0.8' }));
}

export function drawActorLifeline(svg, data, map, sliderMs, startMs, endMs, color, tokenImg, actorId) {
    const { waypoints, segments } = data;
    if (waypoints.length === 0) return;

    const g = el('g', { 'data-actor-id': actorId });

    // Draw path segments
    for (const seg of segments) {
        drawSegment(g, seg, map, color, startMs, endMs);
    }

    // Draw clock indicator at current slider position
    const pos = interpolatePosition(waypoints, sliderMs, map);
    if (pos) drawClock(svg, g, pos, sliderMs, tokenImg, actorId, color);

    // Boundary arrows where lifeline extends beyond the timeline bracket
    const firstMs = waypoints[0].ms;
    const lastMs  = waypoints[waypoints.length - 1].ms;

    if (firstMs < startMs) {
        const firstInBracket = waypoints.find(w => w.ms >= startMs);
        if (firstInBracket) {
            const px = map.project([firstInBracket.lng, firstInBracket.lat]);
            drawArrow(g, px, 'before', color);
        }
    }
    if (lastMs > endMs) {
        const lastInBracket = [...waypoints].reverse().find(w => w.ms <= endMs);
        if (lastInBracket) {
            const px = map.project([lastInBracket.lng, lastInBracket.lat]);
            drawArrow(g, px, 'after', color);
        }
    }

    svg.appendChild(g);
}
