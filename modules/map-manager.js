/*
Map manager for Continuum.
Lifeline section maps use MapLibre GL JS + OpenHistoricalMap (OHM) tiles.
loadGoogleMaps() is kept for org-map.js backward compatibility only.
*/

if (typeof window !== 'undefined' && !window.googleMapsPromise) {
    let resolveApi;
    window.googleMapsPromise = new Promise(resolve => { resolveApi = resolve; });
    window.resolveGoogleMapsApi = resolveApi;
}

import { loadApi }         from './lifeline/services/map/load-api.js';
import { isCoordsValid }   from './span-graph-utils.js';
import { reportApiError }  from './lifeline/services/map/report-api-error.js';
import { geocodeAddress, reverseGeocode } from './lifeline/services/map/nominatim.js';
export { geocodeAddress, reverseGeocode };

// Inline OSM raster style - no external JSON fetch required, same as SpaceTime's working default
const LIFELINE_MAP_STYLE = {
    version: 8,
    sources: { osm: { type: 'raster', tileSize: 256, maxzoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'] } },
    layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }]
};

let globalMapInstance = null;
const mapStates = {};  // actorId -> { instance, center, zoom }

// Kept for org-map.js backward compatibility - loads Google Maps API if key is configured
export async function loadGoogleMaps() { return loadApi(); }

// Load MapLibre from CDN if not already present (SpaceTime may have loaded it first)
function _ensureMapLibre() {
    if (window.maplibregl) return Promise.resolve();
    return new Promise((res, rej) => {
        const lnk = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css' });
        const scr = Object.assign(document.createElement('script'), { src: 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js', onload: res, onerror: () => rej(new Error('MapLibre failed to load.')) });
        document.head.appendChild(lnk);
        document.head.appendChild(scr);
    });
}

export function setMapInstance(instance) { globalMapInstance = instance; }
export function getMapInstance(actorId)  { return actorId ? mapStates[actorId]?.instance : globalMapInstance; }

export function updateActorMapState(actorId, lat, lng, zoom) {
    if (!actorId) return;
    const fLat = parseFloat(lat), fLng = parseFloat(lng);
    if (!isCoordsValid(fLat, fLng)) return;
    if (!mapStates[actorId]) mapStates[actorId] = {};
    mapStates[actorId].center = { lat: fLat, lng: fLng };
    mapStates[actorId].zoom   = Number(zoom) || 12;
}

// MAP INITIALIZATION

// Called once the container has non-zero dimensions - creates the MapLibre instance.
async function _createMap(containerElement, defaultLat, defaultLng, actorId) {
    if (containerElement.querySelector('.maplibregl-canvas')) return;
    try {
        await _ensureMapLibre();
        const saved = mapStates[actorId];
        let center = [0, 20], zoom = 3;
        if (saved?.center && isCoordsValid(saved.center.lat, saved.center.lng)) {
            center = [saved.center.lng, saved.center.lat];
            zoom   = saved.zoom || 12;
        } else if (isCoordsValid(defaultLat, defaultLng)) {
            center = [Number(defaultLng), Number(defaultLat)];
            zoom   = 12;
        }
        const map = new window.maplibregl.Map({
            container: containerElement,
            style: LIFELINE_MAP_STYLE,
            center, zoom,
            maxZoom: 19, minZoom: 2,
            dragPan: true, scrollZoom: true, doubleClickZoom: false,
            attributionControl: false, fadeDuration: 0
        });
        if (!mapStates[actorId]) mapStates[actorId] = {};
        mapStates[actorId].instance = map;
        setMapInstance(map);
        map.once('load', () => { map.resize(); });
        map.on('moveend', () => {
            const c = map.getCenter();
            mapStates[actorId].center = { lat: c.lat, lng: c.lng };
            mapStates[actorId].zoom   = map.getZoom();
        });
    } catch (err) {
        console.error('Continuum | Lifeline map init error:', err);
        reportApiError(err.message);
    }
}

export function initializeLifelineMap(containerElement, defaultLat, defaultLng, actorId) {
    if (!containerElement || !actorId) return;
    const stale = mapStates[actorId]?.instance;
    if (stale && !containerElement.querySelector('.maplibregl-canvas')) {
        stale.remove();
        mapStates[actorId].instance = null;
    }
    if (containerElement.querySelector('.maplibregl-canvas')) return;

    // Defer creation until the container has real dimensions.
    // The Lifeline section is collapsed (display:none on ancestor) at sheet open,
    // so the container is 0x0 - MapLibre cannot create a valid WebGL context at that size.
    const rect = containerElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        const ro = new ResizeObserver(entries => {
            if (entries[0]?.contentRect.width > 0) {
                ro.disconnect();
                _createMap(containerElement, defaultLat, defaultLng, actorId);
            }
        });
        ro.observe(containerElement);
        return;
    }
    _createMap(containerElement, defaultLat, defaultLng, actorId);
}

// NAVIGATION

export function panToCoordinates(lat, lng, zoom = 12, actorId = null) {
    if (!isCoordsValid(lat, lng)) return;
    const stApi = game.modules.get('spacetime')?.api;
    if (stApi?.panTo) { stApi.panTo(lat, lng, zoom, true); return; }
    const map = (actorId && mapStates[actorId]?.instance) || globalMapInstance;
    if (!map) return;
    if (typeof map.jumpTo === 'function') {
        map.jumpTo({ center: [Number(lng), Number(lat)], zoom: Number(zoom) });
    } else if (typeof map.panTo === 'function') {
        map.panTo({ lat: Number(lat), lng: Number(lng) });
        map.setZoom(Number(zoom));
    }
}

export function panMapByPixels(dx, dy, actorId) {
    const map = mapStates[actorId]?.instance;
    if (!map) return;
    if (typeof map.getStyle === 'function') {
        // MapLibre: negate delta - panBy moves center, drag should move content
        map.panBy([-dx, -dy], { animate: false });
    } else if (map.getProjection) {
        // Google Maps fallback: Mercator projection approach
        const proj  = map.getProjection();
        const zoom  = map.getZoom();
        if (!proj || zoom === undefined) return;
        const scale = Math.pow(2, zoom);
        const wc    = proj.fromLatLngToPoint(map.getCenter());
        const np    = new window.google.maps.Point(wc.x - dx / scale, wc.y - dy / scale);
        const nc    = proj.fromPointToLatLng(np);
        if (nc) map.setCenter(nc);
    }
}

export function triggerMapResize(actorId) {
    const map = (actorId && mapStates[actorId]?.instance) || globalMapInstance;
    if (!map) return;
    if (typeof map.resize === 'function') {
        // MapLibre: resize immediately, then again next frame in case the container
        // is still transitioning from a collapsed section (display:none -> block)
        map.resize();
        requestAnimationFrame(() => map.resize());
    } else if (window.google?.maps?.event) {
        window.google.maps.event.trigger(map, 'resize'); // Google Maps
        const c = map.getCenter();
        if (c) map.setCenter(c);
    }
}

// GEOCODING - uses Nominatim; no API key required

export async function getMapCenterLocation(actorId = null) {
    const stApi = game.modules.get('spacetime')?.api;
    if (stApi?.getMap) {
        const stMap = stApi.getMap();
        if (stMap) {
            const c = stMap.getCenter();
            const formattedAddress = await reverseGeocode(c.lat, c.lng);
            return { lat: c.lat, lng: c.lng, zoom: stMap.getZoom(), formattedAddress };
        }
    }
    let map = (actorId && mapStates[actorId]?.instance) || globalMapInstance;
    if (!map) { const s = Object.values(mapStates).find(s => s.instance); if (s) map = s.instance; }
    if (!map) return null;
    const raw = map.getCenter();
    const lat = typeof raw.lat === 'function' ? raw.lat() : raw.lat;
    const lng = typeof raw.lng === 'function' ? raw.lng() : raw.lng;
    const formattedAddress = await reverseGeocode(lat, lng);
    return { lat, lng, zoom: map.getZoom(), formattedAddress };
}

export async function panToLocation(address, actorId = null) {
    const result = await geocodeAddress(address);
    if (result) panToCoordinates(result.lat, result.lng, result.zoom, actorId);
    return result ?? null;
}
