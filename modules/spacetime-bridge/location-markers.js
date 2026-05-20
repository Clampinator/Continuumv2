/*
Location markers on the SpaceTime world map.
Each event (or span origin/destination) that has saved lat/lng coordinates
gets a small circular token image marker. Markers refresh automatically
when actor data changes. Only actors with spaceTimeLinked are shown.
Right-click on a marker shows "Update from Token" to stamp the token's
current position onto that event.
*/

const _markers = new Map(); // key -> { marker, lat, lng }
let _updateFn = null; // updateEventFromToken, injected from index.js
let _mapRef = null;   // map instance for re-use in context menu

const COLOR_PALETTE = ['#22d3ee', '#f59e0b', '#84cc16', '#f43f5e', '#a78bfa', '#fb923c'];

function _colorForActor(actorId) {
    let h = 0;
    for (let i = 0; i < actorId.length; i++) h = (h * 31 + actorId.charCodeAt(i)) & 0xffffffff;
    return COLOR_PALETTE[Math.abs(h) % COLOR_PALETTE.length];
}

function _tokenImg(actor) {
    const src = actor.prototypeToken?.texture?.src;
    return (src && src !== actor.img) ? src : (actor.img || 'icons/svg/mystery-man.svg');
}

function _ok(v) { return v !== null && v !== undefined && v !== ''; }

// Collect all located events for one actor.
// Returns array of { key, lat, lng, label, tokenSrc, color }.
function _collectLocations(actor) {
    const locs    = [];
    const tokenSrc = _tokenImg(actor);
    const color   = _colorForActor(actor.id);
    const name    = actor.name;

    function push(key, lat, lng, eventTitle) {
        if (_ok(lat) && _ok(lng))
            locs.push({ key, lat: Number(lat), lng: Number(lng),
                label: `${name}: ${eventTitle}`, tokenSrc, color });
    }

    function scanEvents(events, prefix) {
        for (const [id, evt] of Object.entries(events || {})) {
            if (!evt.eventIsSpan) {
                push(`${prefix}:${id}`, evt.lat, evt.lng, evt.eventTitle || 'Event');
            } else {
                push(`${prefix}:${id}:from`, evt.eventSpanFromLat, evt.eventSpanFromLng,
                    (evt.eventTitle || 'Span') + ' - origin');
                push(`${prefix}:${id}:to`, evt.eventSpanToLat, evt.eventSpanToLng,
                    (evt.eventTitle || 'Span') + ' - destination');
            }
        }
    }

    // Birthplace (genesis node)
    const p = actor.system.personal || {};
    push(`${actor.id}:birth`, p.birthLat, p.birthLng, p.birthLocation || 'Birthplace');

    for (const [eraId, era] of Object.entries(actor.system.eras || {})) {
        scanEvents(era.events, `${actor.id}:${eraId}`);
        for (const [expId, exp] of Object.entries(era.experiences || {})) {
            scanEvents(exp.events, `${actor.id}:${eraId}:${expId}`);
        }
    }
    return locs;
}

function _makeEl(tokenSrc, color) {
    const el = document.createElement('div');
    Object.assign(el.style, {
        width: '28px', height: '28px',
        borderRadius: '50%',
        backgroundColor: '#555',
        backgroundImage: `url("${tokenSrc}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: `2px solid ${color}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.8)',
        cursor: 'pointer',
        flexShrink: '0'
    });
    return el;
}

// Create or move a single marker. Moves it in-place if lat/lng changed.
function _upsertMarker(loc, map) {
    const existing = _markers.get(loc.key);
    if (existing) {
        if (existing.lat !== loc.lat || existing.lng !== loc.lng) {
            existing.marker.setLngLat([loc.lng, loc.lat]);
            existing.marker.getPopup()
                ?.setHTML(`<div style="font-size:0.82em;color:#111;padding:2px 4px">${loc.label}</div>`);
            existing.lat = loc.lat;
            existing.lng = loc.lng;
        }
        return;
    }
    const el = _makeEl(loc.tokenSrc, loc.color);
    el.dataset.markerKey = loc.key;
    el.addEventListener('contextmenu', (e) => _onMarkerContextMenu(e, loc.key));
    const popup = new window.maplibregl.Popup({ offset: 12, closeButton: false, maxWidth: '220px' })
        .setHTML(`<div style="font-size:0.82em;color:#111;padding:2px 4px">${loc.label}</div>`);
    const marker = new window.maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([loc.lng, loc.lat])
        .setPopup(popup)
        .addTo(map);
    _markers.set(loc.key, { marker, lat: loc.lat, lng: loc.lng });
}

// Right-click context menu on a location marker.
function _onMarkerContextMenu(e, markerKey) {
    e.preventDefault();
    e.stopPropagation();

    // Decode actorId from marker key (first segment before ':')
    const actorId = markerKey.split(':')[0];
    const actor = game.actors.get(actorId);
    if (!actor) return;

    // Find the actor's proxy token on the current scene
    let tokenDoc = null;
    for (const scene of game.scenes) {
        for (const td of scene.tokens) {
            if (td.actorId === actorId && td.getFlag('spacetime', 'isProxy')) {
                tokenDoc = td;
                break;
            }
        }
        if (tokenDoc) break;
    }

    const old = document.getElementById('continuum-marker-context-menu');
    if (old) old.remove();

    const menu = document.createElement('div');
    menu.id = 'continuum-marker-context-menu';
    menu.innerHTML = `
        <button class="context-menu-item" data-action="update-from-token">
            <i class="fas fa-map-pin"></i> Update from Token
        </button>`;
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    document.body.appendChild(menu);

    const closeMenu = () => {
        menu.remove();
        window.removeEventListener('click', outsideClose, true);
        window.removeEventListener('keydown', onKey);
    };
    const outsideClose = (ev) => { if (!menu.contains(ev.target)) closeMenu(); };
    const onKey = (ev) => { if (ev.key === 'Escape') closeMenu(); };
    setTimeout(() => {
        window.addEventListener('click', outsideClose, true);
        window.addEventListener('keydown', onKey);
    }, 100);

    menu.querySelector('[data-action="update-from-token"]').addEventListener('click', async () => {
        closeMenu();
        if (!_updateFn || !tokenDoc) {
            ui.notifications.warn('No token found for this character on the map.');
            return;
        }
        await _updateFn(actor, tokenDoc, markerKey);
    });
}

// Targeted refresh for one actor: upserts current markers, removes stale ones.
// Called when updateActor fires with changes to system.eras.
function _refreshActor(actor, map) {
    if (!window.maplibregl) return;
    if (!(game.user.isGM || actor.isOwner)) return;
    if (!(actor.getFlag('continuum-v2', 'spaceTimeLinked') ?? false)) return;

    const currentLocs = _collectLocations(actor);

    // DIAGNOSTIC: Log how many locations found for this actor
    console.debug(
        `[Continuum Bridge] _refreshActor(${actor.name}):`,
        `${currentLocs.length} locations found`,
        currentLocs.length > 0 ? `sample: ${currentLocs[0].label} lat=${currentLocs[0].lat} lng=${currentLocs[0].lng}` : ''
    );

    const currentKeys = new Set(currentLocs.map(l => l.key));

    // Remove markers that no longer have coordinates for this actor
    for (const [key, entry] of _markers) {
        if (key.startsWith(actor.id + ':') && !currentKeys.has(key)) {
            entry.marker.remove();
            _markers.delete(key);
        }
    }
    for (const loc of currentLocs) _upsertMarker(loc, map);
}

// Full refresh across all linked actors. Used on init and actor create/delete.
function _refresh(map) {
    if (!game.actors || !window.maplibregl) return;
    const visible = game.actors.filter(a => {
        if (!['character', 'organization', 'location'].includes(a.type)) return false;
        if (!(game.user.isGM || a.isOwner)) return false;
        return a.getFlag('continuum-v2', 'spaceTimeLinked') ?? false;
    });
    const keep = new Set();
    for (const actor of visible)
        for (const loc of _collectLocations(actor)) { keep.add(loc.key); _upsertMarker(loc, map); }
    for (const [key, entry] of _markers)
        if (!keep.has(key)) { entry.marker.remove(); _markers.delete(key); }
}

export function setupLocationMarkers(map, updateEventFromToken) {
    _updateFn = updateEventFromToken;
    _mapRef = map;
    if (!game.actors) {
        Hooks.once('ready', () => _refresh(map));
    } else {
        _refresh(map);
    }

    // When an event is saved, only touch markers for the actor whose eras changed.
    // Fall back to full refresh for flag changes (spaceTimeLinked toggled, etc.).
    Hooks.on('updateActor', (actor, changes) => {
        if (changes?.system?.eras) _refreshActor(actor, map);
        else _refresh(map);
    });
    Hooks.on('createActor', () => _refresh(map));
    Hooks.on('deleteActor', () => _refresh(map));
}
