
// continuum/modules/org-map.js

import { loadGoogleMaps, panToLocation, geocodeAddress, setMapInstance } from '../span-graph-map.js';
import { normalizeDateInput } from '../span-graph-utils.js';
import { activateDatePickers } from '../date-picker.js';
import { openEditDialog } from './org-graph-dialogs.js';
import { renderDatePicker } from '../span-graph-ui-helpers.js';

// SVG Path Constants for Symbols
const PATH_CIRCLE = 'M -1,0 A 1,1 0 1,1 1,0 A 1,1 0 1,1 -1,0 Z';
const PATH_STAR = 'M 0,-1 L 0.2,-0.2 L 1,-0.2 L 0.4,0.2 L 0.6,1 L 0,0.6 L -0.6,1 L -0.4,0.2 L -1,-0.2 L -0.2,-0.2 Z';
const PATH_DIAMOND = 'M 0,-1.2 L 0.8,0 L 0,1.2 L -0.8,0 Z';

const MAP_STYLE = [
    { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
    { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
    { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
];

const UNIT_COLORS = {
    hq: '#FFD700',
    physical: '#E32017',
    espionage: '#003688',
    psyops: '#9B0056',
    online: '#00782A',
    default: '#888888'
};

// --- Module-level state ---
let mapInstance = null;
let activeSheetId = null;
let hqMarkerRef = null;

// Persists zoom/center/range/sliderTime across re-renders and page refreshes, keyed by actorId
const orgMapStates = {};

function loadMapState(actorId) {
    try {
        const raw = localStorage.getItem(`continuum-org-map-${actorId}`);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

function saveMapState(actorId, updates) {
    const next = { ...(orgMapStates[actorId] || {}), ...updates };
    orgMapStates[actorId] = next;
    try { localStorage.setItem(`continuum-org-map-${actorId}`, JSON.stringify(next)); } catch {}
}

// unitMapData: unitId -> { type, points: [{lat, lng, time, isHQ, data, marker}], segments: [{line, p1, p2}] }
let unitMapData = {};

// Flat list of all polylines for the animation interval
const allPolylines = [];

// UI state
let hiddenTypes = new Set();
let currentSliderTime = Infinity;
let unitInfoWindow = null;

// Location actor markers (separate from unit markers — static, time-independent)
let locationMarkers = [];
let locationHooksRegistered = false;

// --- Animation loop (single global interval) ---
if (!window._orgMapAnimationInterval) {
    window._orgMapAnimationInterval = setInterval(() => {
        for (const line of allPolylines) {
            if (line._animStep === undefined) continue;
            line._animOffset = (line._animOffset + line._animStep) % 100;
            const icons = line.get('icons');
            if (icons && icons[0]?.repeat) {
                icons[0].offset = line._animOffset + '%';
                line.set('icons', icons);
            }
        }
    }, 50);
}

// --- Main init ---
export async function initializeOrgMap(html, sheet) {
    const container = html.find('#org-operational-map')[0];
    if (!container) return;

    // Cleanup previous state
    if (hqMarkerRef) { hqMarkerRef.setMap(null); hqMarkerRef = null; }
    for (const ud of Object.values(unitMapData)) {
        if (ud.currentMarker) ud.currentMarker.setMap(null);
        for (const p of ud.points) { if (p.marker) p.marker.setMap(null); }
        for (const s of ud.segments) { if (s.line) s.line.setMap(null); }
    }
    if (unitInfoWindow) { unitInfoWindow.close(); unitInfoWindow = null; }
    for (const m of locationMarkers) m.setMap(null);
    locationMarkers = [];
    unitMapData = {};
    allPolylines.length = 0;
    hiddenTypes = new Set();
    currentSliderTime = Infinity;
    activeSheetId = sheet.actor.id;

    // Load persisted state from localStorage if not already in memory this session
    if (!orgMapStates[sheet.actor.id]) {
        orgMapStates[sheet.actor.id] = loadMapState(sheet.actor.id);
    }

    try {
        await loadGoogleMaps();
        if (!window.google || !window.google.maps) throw new Error("Google Maps API failed to load.");

        const actorSystem = sheet.actor.system;
        const hqLat = parseFloat(actorSystem.structure?.headquartersLat);
        const hqLng = parseFloat(actorSystem.structure?.headquartersLng);
        const hasValidHQ = Number.isFinite(hqLat) && Number.isFinite(hqLng);
        const hqLocation = hasValidHQ ? { lat: hqLat, lng: hqLng } : { lat: 0, lng: 0 };

        const inceptionStr = actorSystem.structure?.inceptionDate || "2000-01-01";
        const hqTime = new Date(inceptionStr + "T00:00:00").getTime();

        // Restore previous view state if the user has already panned/zoomed this map
        const savedState = orgMapStates[sheet.actor.id];
        const initialCenter = savedState?.center ?? hqLocation;
        const initialZoom = savedState?.zoom ?? (hasValidHQ ? 4 : 2);

        const mapOptions = {
            center: initialCenter,
            zoom: initialZoom,
            disableDefaultUI: true,
            styles: MAP_STYLE,
            backgroundColor: '#050508',
            draggable: true,
            scrollwheel: true,
            gestureHandling: 'greedy'
        };

        mapInstance = new window.google.maps.Map(container, mapOptions);
        setMapInstance(mapInstance);

        // Persist center/zoom whenever the map settles
        mapInstance.addListener('idle', () => {
            const c = mapInstance.getCenter();
            if (c) saveMapState(sheet.actor.id, { center: { lat: c.lat(), lng: c.lng() }, zoom: mapInstance.getZoom() });
        });

        // HQ marker
        if (hasValidHQ) {
            hqMarkerRef = new window.google.maps.Marker({
                position: hqLocation,
                map: mapInstance,
                eventTitle: "Headquarters",
                icon: {
                    path: PATH_STAR,
                    scale: 10,
                    fillColor: UNIT_COLORS.hq,
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: '#fff'
                },
                zIndex: 1000
            });
        }

        const units = getAllUnits(sheet.actor);
        const allEngagements = getAllEngagements(sheet.actor);

        // Build unitMapData
        units.forEach(unit => {
            const history = allEngagements.filter(e => e.unitId === unit.id);
            history.sort((a, b) => {
                const dA = new Date(a.date + "T" + (a.time || "00:00")).getTime();
                const dB = new Date(b.date + "T" + (b.time || "00:00")).getTime();
                return dA - dB;
            });

            const points = [];
            if (hasValidHQ) {
                points.push({ lat: hqLat, lng: hqLng, time: hqTime, isHQ: true, data: null, marker: null });
            }

            history.forEach(eng => {
                const lat = parseFloat(eng.eventSpanFromLat);
                const lng = parseFloat(eng.eventSpanFromLng);
                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    const t = new Date(eng.date + "T" + (eng.time || "00:00")).getTime();
                    let dateTo = null;
                    if (eng.dateTo) {
                        dateTo = new Date(eng.dateTo + "T" + (eng.timeTo || "23:59")).getTime();
                    }
                    points.push({ lat, lng, time: t, dateTo, isHQ: false, data: eng, marker: null });
                }
            });

            const color = UNIT_COLORS[unit.type] || UNIT_COLORS.default;

            // Small fixed history dots — one per engagement waypoint (right-click to edit)
            for (let i = hasValidHQ ? 1 : 0; i < points.length; i++) {
                const p = points[i];
                const eng = p.data;
                const marker = new window.google.maps.Marker({
                    position: { lat: p.lat, lng: p.lng },
                    map: null,
                    eventTitle: eng?.name || unit.name,
                    draggable: true,
                    icon: {
                        path: PATH_CIRCLE,
                        scale: 4,
                        fillColor: color,
                        fillOpacity: 0.45,
                        strokeWeight: 1,
                        strokeColor: '#777'
                    },
                    zIndex: 100
                });
                if (eng) {
                    marker.addListener('rightclick', () => openEditDialog('engagement', eng, sheet));
                    marker.addListener('dragend', async (event) => {
                        const path = `system.phases.${eng.phaseId}.operations.${eng.opId}.engagements.${eng.id}`;
                        await sheet.actor.update({
                            [`${path}.eventSpanFromLat`]: event.latLng.lat(),
                            [`${path}.eventSpanFromLng`]: event.latLng.lng()
                        });
                    });
                }
                p.marker = marker;
            }

            // One large animated marker per unit — its position interpolates with the slider
            const startPos = hasValidHQ ? hqLocation : (points[0] ?? { lat: 0, lng: 0 });
            const currentMarker = new window.google.maps.Marker({
                position: { lat: startPos.lat, lng: startPos.lng },
                map: null,
                eventTitle: unit.name,
                draggable: true,
                icon: {
                    path: PATH_CIRCLE,
                    scale: 7,
                    fillColor: color,
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: '#fff'
                },
                zIndex: 600
            });

            // Hover tooltip InfoWindow
            const unitIW = new window.google.maps.InfoWindow({
                content: buildUnitInfoContent(unit, unit.raw || {}, color),
                disableAutoPan: true
            });
            currentMarker.addListener('mouseover', () => {
                if (unitInfoWindow && unitInfoWindow !== unitIW) unitInfoWindow.close();
                unitInfoWindow = unitIW;
                unitIW.open(mapInstance, currentMarker);
            });
            currentMarker.addListener('mouseout', () => { unitIW.close(); });

            // Helper: find the engagement the unit is currently at (last reached at slider time)
            const getCurrentEng = () => {
                const engPoints = points.filter(p => !p.isHQ);
                let idx = -1;
                for (let i = 0; i < engPoints.length; i++) {
                    if (engPoints[i].time <= currentSliderTime) idx = i;
                    else break;
                }
                return idx >= 0 ? engPoints[idx].data : null;
            };

            // Right-click → open edit dialog for current engagement
            currentMarker.addListener('rightclick', () => {
                const eng = getCurrentEng();
                if (eng) openEditDialog('engagement', eng, sheet);
            });

            // Left-drag → create a new keyframe at the current slider time, or update if exact match
            currentMarker.addListener('dragend', async (event) => {
                const newLat = event.latLng.lat();
                const newLng = event.latLng.lng();
                const sliderTs = currentSliderTime;

                // If slider time exactly matches an existing engagement for this unit, update it in place
                const engPoints = points.filter(p => !p.isHQ);
                const exactMatch = engPoints.find(p => p.time === sliderTs);
                if (exactMatch?.data) {
                    const eng = exactMatch.data;
                    const path = `system.phases.${eng.phaseId}.operations.${eng.opId}.engagements.${eng.id}`;
                    await sheet.actor.update({ [`${path}.eventSpanFromLat`]: newLat, [`${path}.eventSpanFromLng`]: newLng });
                    return;
                }

                // Otherwise create a new keyframe at the slider's current date/time
                const context = getCurrentEng();
                if (!context || !Number.isFinite(sliderTs)) {
                    applyTimeFilter(); // snap back — no valid context
                    return;
                }

                const d = new Date(sliderTs);
                const dateStr = d.toISOString().split('T')[0];
                const timeStr = d.toTimeString().split(' ')[0].substring(0, 5);
                const eid = foundry.utils.randomID();
                await sheet.actor.update({
                    [`system.phases.${context.phaseId}.operations.${context.opId}.engagements.${eid}`]: {
                        id: eid,
                        name: `${unit.name} — ${dateStr}`,
                        date: dateStr,
                        time: timeStr,
                        dateTo: null,
                        timeTo: null,
                        unitId: unit.id,
                        eventSpanFromLat: newLat,
                        eventSpanFromLng: newLng,
                        eventSpanFromLocation: '',
                        description: ''
                    }
                });
            });

            // Create path segments
            const segments = [];
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];
                const timeDiff = p2.time - p1.time;
                const isSpanDown = timeDiff < 0;
                const durationSeconds = Math.abs(timeDiff) / 1000;

                let step = 0.5;
                if (durationSeconds < 3600) step = 2.0;
                else if (durationSeconds < 86400 * 7) step = 1.2;
                else step = 0.4;

                const icons = [{
                    icon: { path: 'M 0,-2 0,2', strokeOpacity: 1, strokeWeight: 4, strokeColor: color, scale: 2 },
                    offset: '0%', repeat: '20px'
                }];

                if (isSpanDown) {
                    icons.push({
                        icon: { path: 'M -4,-4 0,4 4,-4 z', fillColor: '#ff0000', fillOpacity: 1, strokeWeight: 1, strokeColor: '#fff', scale: 2 },
                        offset: '50%'
                    });
                }

                const line = new window.google.maps.Polyline({
                    path: [{ lat: p1.lat, lng: p1.lng }, { lat: p2.lat, lng: p2.lng }],
                    geodesic: true, strokeOpacity: 0, icons, map: mapInstance, clickable: true
                });
                line._animOffset = 0;
                line._animStep = step;
                line.addListener('click', (e) => showInsertNodeDialog(sheet, unit, p1, p2, e.latLng.lat(), e.latLng.lng()));
                allPolylines.push(line);
                segments.push({ line, p1, p2 });
            }

            unitMapData[unit.id] = { type: unit.type, points, segments, currentMarker };
        });

        // Compute time range
        const engagementTimes = allEngagements
            .map(e => new Date(e.date + "T" + (e.time || "00:00")).getTime())
            .filter(t => Number.isFinite(t));
        const minTime = hqTime;
        const maxTime = engagementTimes.length > 0 ? Math.max(...engagementTimes) : hqTime;

        // Collect phase boundaries for slider ticks
        const phaseTimes = [];
        const phases = actorSystem.phases || {};
        Object.values(phases).forEach(phase => {
            if (phase?.dateFrom) {
                const t = new Date(phase.dateFrom + "T00:00:00").getTime();
                if (Number.isFinite(t)) phaseTimes.push(t);
            }
        });

        // Build per-engagement keyframes for the slider dot track (time + unit color)
        const unitTypeMap = {};
        const unitNameMap = {};
        units.forEach(u => { unitTypeMap[u.id] = u.type; unitNameMap[u.id] = u.name; });
        const engKeyframes = allEngagements
            .map(e => {
                const t = new Date(e.date + "T" + (e.time || "00:00")).getTime();
                if (!Number.isFinite(t)) return null;
                const unitType = unitTypeMap[e.unitId] || 'default';
                const unitName = unitNameMap[e.unitId] || 'Unit';
                return { time: t, color: UNIT_COLORS[unitType] || UNIT_COLORS.default, unitName };
            })
            .filter(Boolean);

        // Setup slider and legend
        setupTimeSlider(html, sheet.actor.id, minTime, maxTime, phaseTimes, engagementTimes.length > 0, engKeyframes);
        setupLegendToggles(html);

        // Build location markers — all revealed location actors with valid coordinates
        buildLocationMarkers(html);
        ensureLocationHooks();

        // Reset button — pan back to HQ
        html.find('.reset-map-view').on('click', (e) => {
            e.preventDefault();
            mapInstance.panTo(hqLocation);
            mapInstance.setZoom(hasValidHQ ? 4 : 2);
        });

        // Location search
        const searchInput = html.find('.map-search-input');
        const searchBtn = html.find('.map-search-btn');
        const doSearch = async () => {
            const query = searchInput.val().trim();
            if (!query) return;
            searchBtn.find('i').attr('class', 'fas fa-spinner fa-spin');
            const result = await geocodeAddress(query);
            searchBtn.find('i').attr('class', 'fas fa-search');
            if (result) {
                mapInstance.panTo({ lat: result.lat, lng: result.lng });
                mapInstance.setZoom(result.zoom ?? 10);
                searchInput.val(result.formattedAddress || query);
            } else {
                searchInput.addClass('map-search-error');
                setTimeout(() => searchInput.removeClass('map-search-error'), 1500);
            }
        };
        searchBtn.on('click', (e) => { e.preventDefault(); doSearch(); });
        searchInput.on('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });

        // Unit drop from Conflict section
        container.addEventListener('dragover', (e) => e.preventDefault());
        container.addEventListener('drop', async (e) => {
            e.preventDefault();
            let unitData;
            try { unitData = JSON.parse(e.dataTransfer.getData('application/continuum-unit')); }
            catch { return; }
            if (!unitData?.unitId) return;

            const latLng = pixelToLatLng(mapInstance, container, e.clientX, e.clientY);
            if (!latLng) return;

            // If dropped near a revealed location, initiate conflict instead of deployment
            const targetLocation = findNearbyLocation(e.clientX, e.clientY, container);
            if (targetLocation) {
                await showInitiateConflictDialog(sheet, unitData, targetLocation, latLng.lat(), latLng.lng());
            } else {
                await showEstablishDeploymentDialog(sheet, unitData, latLng.lat(), latLng.lng());
            }
        });

        // Initial render: restore saved slider time if available, otherwise show present
        currentSliderTime = orgMapStates[sheet.actor.id]?.sliderTime ?? maxTime;
        applyTimeFilter();

    } catch (err) {
        console.error("Continuum | Org Map Error:", err);
        container.innerHTML = `<div style="color:#ff6666; text-align:center; padding:20px;">Map Error: ${err.message}</div>`;
    }
}

// --- Time Slider ---
function setupTimeSlider(html, actorId, minTime, maxTime, phaseTimes, hasDeployments, engKeyframes) {
    const slider = html.find('.map-time-slider');
    const currentLabel = html.find('.map-time-label');
    const startInput = html.find('.map-time-range-start');
    const endInput = html.find('.map-time-range-end');
    const ticklistId = `map-phase-ticks-${actorId}`;
    if (!slider.length) return;

    const toISODate = (ts) => new Date(ts).toISOString().split('T')[0];

    if (!hasDeployments || minTime === maxTime) {
        slider.prop('disabled', true).attr('eventTitle', 'No deployments recorded');
        currentLabel.text('No deployments');
        return;
    }

    // Restore user-adjusted range from saved state, falling back to data-derived defaults
    const saved = orgMapStates[actorId] || {};
    const effectiveMin = saved.rangeMin ?? minTime;
    const effectiveMax = saved.rangeMax ?? maxTime;
    const effectiveSlider = saved.sliderTime ?? effectiveMax;

    // Set initial range input values from saved state
    startInput.val(toISODate(effectiveMin));
    endInput.val(toISODate(effectiveMax));

    // Build datalist for phase tick marks
    let datalist = html.find(`#${ticklistId}`);
    if (!datalist.length) {
        datalist = $(`<datalist id="${ticklistId}"></datalist>`);
        slider.after(datalist);
    }
    datalist.empty();
    phaseTimes.forEach(t => {
        if (t >= effectiveMin && t <= effectiveMax) {
            datalist.append(`<option value="${t}"></option>`);
        }
    });
    slider.attr('list', ticklistId);

    slider.attr('min', effectiveMin).attr('max', effectiveMax).val(effectiveSlider);
    currentLabel.text(effectiveSlider >= effectiveMax ? 'Present' : formatSliderDate(effectiveSlider));

    // Keyframe dot track — positioned below the slider, shows one dot per engagement
    let kfTrack = html.find('.slider-keyframes');
    if (!kfTrack.length) {
        kfTrack = $('<div class="slider-keyframes"></div>');
        slider.after(kfTrack);
    }
    renderKeyframeDots(kfTrack, engKeyframes, effectiveMin, effectiveMax);

    // Thumb drag — update current label, filter, and persist
    slider.on('input', function () {
        const ts = parseInt(this.value);
        const rangeMax = parseInt(slider.attr('max'));
        currentSliderTime = ts;
        currentLabel.text(ts >= rangeMax ? 'Present' : formatSliderDate(ts));
        saveMapState(actorId, { sliderTime: ts });
        applyTimeFilter();
    });

    // Start date change — update slider min, re-render dots, and persist
    startInput.on('change', function () {
        const newMin = new Date(this.value + 'T00:00:00').getTime();
        if (!Number.isFinite(newMin)) return;
        const rangeMax = parseInt(slider.attr('max'));
        if (newMin >= rangeMax) return;
        slider.attr('min', newMin);
        saveMapState(actorId, { rangeMin: newMin });
        renderKeyframeDots(kfTrack, engKeyframes, newMin, rangeMax);
        if (currentSliderTime < newMin) {
            currentSliderTime = newMin;
            slider.val(newMin);
            currentLabel.text(formatSliderDate(newMin));
            saveMapState(actorId, { sliderTime: newMin });
            applyTimeFilter();
        }
    });

    // End date change — update slider max, re-render dots, and persist
    endInput.on('change', function () {
        const newMax = new Date(this.value + 'T23:59:59').getTime();
        if (!Number.isFinite(newMax)) return;
        const rangeMin = parseInt(slider.attr('min'));
        if (newMax <= rangeMin) return;
        slider.attr('max', newMax);
        saveMapState(actorId, { rangeMax: newMax });
        renderKeyframeDots(kfTrack, engKeyframes, rangeMin, newMax);
        if (currentSliderTime > newMax) {
            currentSliderTime = newMax;
            slider.val(newMax);
            currentLabel.text('Present');
            saveMapState(actorId, { sliderTime: newMax });
            applyTimeFilter();
        }
    });
}

// Renders colored keyframe dots onto the track for each engagement within [rangeMin, rangeMax]
function renderKeyframeDots(container, keyframes, rangeMin, rangeMax) {
    container.empty();
    if (!keyframes?.length || rangeMax <= rangeMin) return;
    const span = rangeMax - rangeMin;
    keyframes.forEach(kf => {
        if (kf.time < rangeMin || kf.time > rangeMax) return;
        const pct = ((kf.time - rangeMin) / span) * 100;
        container.append(
            `<div class="slider-keyframe-dot" style="left:${pct}%;background:${kf.color};" eventTitle="${kf.unitName ? kf.unitName + ' — ' : ''}${formatSliderDate(kf.time)}"></div>`
        );
    });
}


// --- Live location marker refresh ---
// Tears down and rebuilds all location markers without a sheet reload.
function refreshLocationMarkers() {
    if (!mapInstance) return;
    for (const m of locationMarkers) m.setMap(null);
    locationMarkers = [];
    buildLocationMarkers();
}

// Registers Foundry hooks once so location markers update live.
function ensureLocationHooks() {
    if (locationHooksRegistered) return;
    locationHooksRegistered = true;

    // Location actor created (e.g. manifested from Oracle)
    Hooks.on('createActor', (actor) => {
        if (actor.type === 'location') refreshLocationMarkers();
    });

    // Location actor updated — flag toggled, coordinates changed, etc.
    Hooks.on('updateActor', (actor) => {
        if (actor.type === 'location') refreshLocationMarkers();
    });

    // Location actor deleted
    Hooks.on('deleteActor', (actor) => {
        if (actor.type === 'location') refreshLocationMarkers();
    });
}

// --- Location Actor Markers ---
function buildLocationMarkers(html) {
    if (!mapInstance) return;
    const isHidden = hiddenTypes.has('location');

    // Query all location actors that GMs have revealed
    const locations = game.actors?.filter(a =>
        a.type === 'location' &&
        a.getFlag('continuum-v2', 'revealedOnOrgMap') === true
    ) ?? [];

    for (const loc of locations) {
        const lat = parseFloat(loc.system?.map?.lat);
        const lng = parseFloat(loc.system?.map?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        // Scale marker size by location's scale attribute (range 1-10), min 8 max 14
        const scaleVal = Math.max(1, Math.min(10, loc.system?.attributes?.scale?.value || 5));
        const markerScale = 6 + scaleVal;

        const marker = new window.google.maps.Marker({
            position: { lat, lng },
            map: isHidden ? null : mapInstance,
            eventTitle: loc.name,
            icon: {
                path: PATH_DIAMOND,
                scale: markerScale,
                fillColor: '#F5A623',
                fillOpacity: 0.85,
                strokeWeight: 2,
                strokeColor: '#fff'
            },
            zIndex: 400
        });

        // Info window: name + first 200 chars of briefing (no secret stats)
        const briefingSnippet = (loc.system?.briefing || '').substring(0, 200);
        const infoContent = `<div style="color:#222;max-width:220px;">
            <strong>${loc.name}</strong><br>
            <em>${loc.system?.details?.locality || ''}${loc.system?.details?.year ? ', ' + loc.system.details.year : ''}</em>
            ${briefingSnippet ? '<hr style="margin:4px 0">' + briefingSnippet + '…' : ''}
        </div>`;
        const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });

        marker.addListener('click', () => {
            infoWindow.open(mapInstance, marker);
        });

        marker._locationActor = loc; // store reference for conflict detection
        locationMarkers.push(marker);
    }
}

function formatSliderDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// --- Legend Toggles ---
function setupLegendToggles(html) {
    html.find('.legend-item[data-unit-type]').on('click', function () {
        const type = $(this).data('unit-type');
        const isHiding = !hiddenTypes.has(type);

        if (isHiding) {
            hiddenTypes.add(type);
            $(this).addClass('legend-hidden');
        } else {
            hiddenTypes.delete(type);
            $(this).removeClass('legend-hidden');
        }

        if (type === 'hq') {
            if (hqMarkerRef) hqMarkerRef.setMap(isHiding ? null : mapInstance);
        } else if (type === 'location') {
            for (const m of locationMarkers) m.setMap(isHiding ? null : mapInstance);
        } else {
            applyTimeFilter();
        }
    });
}

// --- Position interpolation ---
// Returns the unit's lat/lng at time T by interpolating between waypoints.
// If the unit hasn't deployed yet or has fully departed, returns null.
function getUnitPositionAtTime(points, time) {
    if (!points.length) return null;

    // Before org inception — not deployed
    if (time < points[0].time) return null;

    // Past the last waypoint — unit is stationary at final position (unless departed)
    const last = points[points.length - 1];
    if (time >= last.time) {
        if (!last.isHQ && last.dateTo && last.dateTo < time) return null;
        return { lat: last.lat, lng: last.lng, inTransit: false };
    }

    // Between two consecutive waypoints — interpolate
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        if (time < p1.time || time >= p2.time) continue;

        // If p1 has an explicit departure date and the unit has already left p1,
        // interpolate from that departure time to p2's arrival time (unit in transit).
        // Otherwise interpolate continuously from p1.time to p2.time.
        const moveStart = (!p1.isHQ && p1.dateTo && p1.dateTo < time) ? p1.dateTo : p1.time;
        const fraction = Math.max(0, Math.min(1, (time - moveStart) / (p2.time - moveStart)));
        return {
            lat: p1.lat + (p2.lat - p1.lat) * fraction,
            lng: p1.lng + (p2.lng - p1.lng) * fraction,
            inTransit: fraction > 0 && fraction < 1
        };
    }

    return null;
}

// --- Time Filter ---
function applyTimeFilter() {
    const time = currentSliderTime;

    for (const ud of Object.values(unitMapData)) {
        const isTypeHidden = hiddenTypes.has(ud.type);
        const color = UNIT_COLORS[ud.type] || UNIT_COLORS.default;
        const engPoints = ud.points.filter(p => !p.isHQ);

        if (isTypeHidden) {
            if (ud.currentMarker) ud.currentMarker.setMap(null);
            for (const p of engPoints) { if (p.marker) p.marker.setMap(null); }
            for (const s of ud.segments) s.line.setMap(null);
            continue;
        }

        // --- Animated unit marker ---
        const pos = getUnitPositionAtTime(ud.points, time);
        if (pos) {
            ud.currentMarker.setPosition({ lat: pos.lat, lng: pos.lng });
            ud.currentMarker.setMap(mapInstance);
            ud.currentMarker.setIcon({
                path: PATH_CIRCLE,
                scale: pos.inTransit ? 5 : 7,
                fillColor: color,
                fillOpacity: pos.inTransit ? 0.65 : 1,
                strokeWeight: 2,
                strokeColor: pos.inTransit ? '#aaa' : '#fff'
            });
        } else {
            ud.currentMarker.setMap(null);
        }

        // --- History waypoint dots (past positions only) ---
        for (const p of engPoints) {
            if (!p.marker) continue;
            p.marker.setMap(p.time <= time ? mapInstance : null);
        }

        // --- Path segments up to current time ---
        for (const s of ud.segments) {
            s.line.setMap(s.p1.time <= time ? mapInstance : null);
        }
    }
}

// --- Pixel to LatLng Conversion ---
function pixelToLatLng(map, containerEl, clientX, clientY) {
    const projection = map.getProjection();
    const bounds = map.getBounds();
    if (!projection || !bounds) return null;

    const rect = containerEl.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const scale = Math.pow(2, map.getZoom());

    const nw = projection.fromLatLngToPoint(
        new window.google.maps.LatLng(bounds.getNorthEast().lat(), bounds.getSouthWest().lng())
    );
    const worldPoint = new window.google.maps.Point(x / scale + nw.x, y / scale + nw.y);
    return projection.fromPointToLatLng(worldPoint);
}

// --- Conflict Type Mapping (unit type → org attribute vs. location attribute) ---
export const CONFLICT_TYPE_MAP = {
    physical:  { orgAttr: 'force',     locAttr: 'scale',    label: 'Physical',  icon: 'fa-fist-raised',  color: '#E32017' },
    espionage: { orgAttr: 'intel',     locAttr: 'cohesion', label: 'Espionage', icon: 'fa-user-secret',  color: '#4a90d9' },
    psyops:    { orgAttr: 'comms',     locAttr: 'civics',   label: 'Psyops',    icon: 'fa-bullhorn',     color: '#c46bb0' },
    online:    { orgAttr: 'influence', locAttr: 'output',   label: 'Online',    icon: 'fa-laptop-code',  color: '#00b050' }
};

// Returns the location actor nearest to the drop point (within 40px), or null.
function findNearbyLocation(clientX, clientY, containerEl) {
    const projection = mapInstance?.getProjection();
    const bounds = mapInstance?.getBounds();
    if (!projection || !bounds) return null;

    const rect = containerEl.getBoundingClientRect();
    const dropX = clientX - rect.left;
    const dropY = clientY - rect.top;
    const scale = Math.pow(2, mapInstance.getZoom());
    const nw = projection.fromLatLngToPoint(
        new window.google.maps.LatLng(bounds.getNorthEast().lat(), bounds.getSouthWest().lng())
    );

    let closest = null;
    let closestDist = 40; // px snap radius
    for (const marker of locationMarkers) {
        if (!marker.getMap()) continue; // skip hidden markers
        const pos = marker.getPosition();
        if (!pos) continue;
        const pt = projection.fromLatLngToPoint(pos);
        const mx = (pt.x - nw.x) * scale;
        const my = (pt.y - nw.y) * scale;
        const dist = Math.sqrt((dropX - mx) ** 2 + (dropY - my) ** 2);
        if (dist < closestDist) { closestDist = dist; closest = marker._locationActor; }
    }
    return closest;
}

// --- Conflict Initiation Dialog (unit dropped on location) ---
async function showInitiateConflictDialog(sheet, unitData, locationActor, lat, lng) {
    const conflictInfo = CONFLICT_TYPE_MAP[unitData.unitType] || CONFLICT_TYPE_MAP.physical;
    const orgAttrVal = sheet.actor.system.attributes[conflictInfo.orgAttr]?.value ?? 0;
    const locAttrVal = locationActor.system.attributes[conflictInfo.locAttr]?.value ?? 0;

    // Snap to location's stored coordinates if available
    const locLat = parseFloat(locationActor.system?.map?.lat) || lat;
    const locLng = parseFloat(locationActor.system?.map?.lng) || lng;

    const sliderDate = new Date(Number.isFinite(currentSliderTime) ? currentSliderTime : Date.now());
    const dateStr = sliderDate.toISOString().split('T')[0];
    const timeStr = sliderDate.toTimeString().split(' ')[0].substring(0, 5);

    let contextOptions = '';
    const phases = sheet.actor.system.phases || {};
    Object.entries(phases).forEach(([pid, p]) => {
        if (!p) return;
        Object.entries(p.operations || {}).forEach(([oid, o]) => {
            if (o) contextOptions += `<option value="${pid}:${oid}">${o.name} (${p.name})</option>`;
        });
    });
    contextOptions += `<option value="new">New Operation...</option>`;

    const ORG_ATTR_LABELS  = { force: 'Force', intel: 'Intel', comms: 'Comms', influence: 'Influence' };
    const LOC_ATTR_LABELS  = { scale: 'Scale', cohesion: 'Cohesion', civics: 'Civics', output: 'Output' };

    const content = `
        <form>
            <div style="text-align:center;margin-bottom:10px;color:${conflictInfo.color};font-size:1.1em;font-weight:bold;">
                <i class="fas ${conflictInfo.icon}"></i> ${conflictInfo.label} Conflict
            </div>
            <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;margin-bottom:14px;text-align:center;">
                <div>
                    <div style="font-size:0.72em;color:#aaa;">${sheet.actor.name}</div>
                    <div style="font-size:0.85em;margin:2px 0;">${ORG_ATTR_LABELS[conflictInfo.orgAttr]}</div>
                    <div style="font-size:2.2em;color:${conflictInfo.color};font-weight:bold;line-height:1;">${orgAttrVal}</div>
                    <div style="font-size:0.72em;color:#aaa;margin-top:2px;">${unitData.unitName}</div>
                </div>
                <div style="font-size:1.6em;color:#666;">⚔</div>
                <div>
                    <div style="font-size:0.72em;color:#aaa;">${locationActor.name}</div>
                    <div style="font-size:0.85em;margin:2px 0;">${LOC_ATTR_LABELS[conflictInfo.locAttr]}</div>
                    <div style="font-size:2.2em;color:#888;font-weight:bold;line-height:1;">${locAttrVal}</div>
                    <div style="font-size:0.72em;color:#aaa;margin-top:2px;">Defense</div>
                </div>
            </div>
            ${renderDatePicker("dateFrom", dateStr, "Date of Engagement")}
            <div class="form-group"><label>Time</label><input type="time" name="timeFrom" value="${timeStr}"/></div>
            <div class="form-group"><label>Operation</label>
                <select name="context" id="conflictContextSelect">${contextOptions}</select>
            </div>
            <div class="form-group" id="newConflictOpGroup" style="display:none">
                <label>Operation Name</label>
                <input type="text" name="newOpName" value="Operation: ${locationActor.name}"/>
            </div>
            <div class="form-group"><label>eventNotes</label><textarea name="description"></textarea></div>
        </form>
    `;

    new Dialog({
        eventTitle: `Engage: ${locationActor.name}`,
        content,
        render: (dialogHtml) => {
            activateDatePickers(dialogHtml);
            dialogHtml.find('#conflictContextSelect').on('change', (e) => {
                dialogHtml.find('#newConflictOpGroup').toggle(e.target.value === 'new');
            });
        },
        buttons: {
            engage: {
                label: "Engage",
                icon: `<i class="fas ${conflictInfo.icon}"></i>`,
                callback: async (dialogHtml) => {
                    const fd = new foundry.applications.ux.FormDataExtended(dialogHtml.find('form')[0]).object;
                    let phaseId, opId;
                    const updates = {};

                    if (fd.context === 'new') {
                        phaseId = foundry.utils.randomID();
                        opId = foundry.utils.randomID();
                        updates[`system.phases.${phaseId}`] = {
                            id: phaseId, name: "Active Operations",
                            dateFrom: normalizeDateInput(fd.dateFrom), operations: {}
                        };
                        updates[`system.phases.${phaseId}.operations.${opId}`] = {
                            id: opId, name: fd.newOpName || `Operation: ${locationActor.name}`,
                            dateFrom: normalizeDateInput(fd.dateFrom), engagements: {}
                        };
                    } else {
                        [phaseId, opId] = fd.context.split(':');
                    }

                    const eid = foundry.utils.randomID();
                    updates[`system.phases.${phaseId}.operations.${opId}.engagements.${eid}`] = {
                        id: eid,
                        name: `${conflictInfo.label}: ${locationActor.name}`,
                        date: normalizeDateInput(fd.dateFrom),
                        time: fd.timeFrom || '00:00',
                        dateTo: null,
                        timeTo: null,
                        unitId: unitData.unitId,
                        eventSpanFromLocation: locationActor.name,
                        eventSpanFromLat: locLat,
                        eventSpanFromLng: locLng,
                        description: fd.description || '',
                        targetLocationId: locationActor.id,
                        conflictType: unitData.unitType
                    };
                    await sheet.actor.update(updates);

                    // Look up the commander linked to this unit (if any)
                    const unitSystemData = sheet.actor.system.conflict[unitData.unitType]?.[unitData.unitId] || {};
                    const commanderId = unitSystemData.commanderId || null;

                    // Notify CCT and any other listeners
                    Hooks.callAll('continuum.unitEngagedLocation', {
                        orgActor: sheet.actor,
                        unit: unitData,
                        locationActor,
                        conflictType: unitData.unitType,
                        commanderId,
                        engagementId: eid,
                        phaseId,
                        opId
                    });
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "engage"
    }, { classes: ["continuum-v2", "dialog"] }).render(true);
}

// --- Establish Deployment Dialog (drag-from-conflict) ---
async function showEstablishDeploymentDialog(sheet, unitData, lat, lng) {
    const sliderDate = new Date(Number.isFinite(currentSliderTime) ? currentSliderTime : Date.now());
    const dateStr = sliderDate.toISOString().split('T')[0];
    const timeStr = sliderDate.toTimeString().split(' ')[0].substring(0, 5);

    // Try to reverse-geocode the drop point for a sensible default name
    let locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const geocoded = await geocodeAddress(`${lat}, ${lng}`);
    if (geocoded?.formattedAddress) locationName = geocoded.formattedAddress;

    let contextOptions = '';
    const phases = sheet.actor.system.phases || {};
    Object.entries(phases).forEach(([pid, p]) => {
        if (!p) return;
        Object.entries(p.operations || {}).forEach(([oid, o]) => {
            if (o) contextOptions += `<option value="${pid}:${oid}">${o.name} (${p.name})</option>`;
        });
    });
    contextOptions += `<option value="new">New Operation...</option>`;

    const dialogStyle = `<style>
        .input-with-btn{display:flex;align-items:center;width:100%;gap:5px}
        .input-with-btn input{flex:1}
        .geo-btn{flex:0 0 32px;height:32px;padding:0;display:flex;align-items:center;justify-content:center;background:#333;border:1px solid #555;color:#8ecae6;border-radius:4px;cursor:pointer}
        .depart-hint{font-size:0.8em;color:#888;margin-top:-6px;}
    </style>`;

    const content = `
        <form>
            ${dialogStyle}
            <div class="form-group">
                <label>Unit</label>
                <strong>${unitData.unitName}</strong>
                <input type="hidden" name="unitId" value="${unitData.unitId}" />
            </div>
            <div class="form-group"><label>Engagement Name</label>
                <input type="text" name="name" value="${unitData.unitName}: ${locationName}" autofocus/>
            </div>
            <div class="form-group"><label>Location</label>
                <div class="input-with-btn">
                    <input type="text" name="location" value="${locationName}" style="flex:1;"/>
                    <input type="hidden" name="lat" value="${lat}"/>
                    <input type="hidden" name="lng" value="${lng}"/>
                    <button type="button" class="geo-btn locate-btn" eventTitle="Geocode"><i class="fas fa-map-marker-alt"></i></button>
                </div>
            </div>
            ${renderDatePicker("dateFrom", dateStr, "Date Established")}
            <div class="form-group"><label>Time</label><input type="time" name="timeFrom" value="${timeStr}"/></div>
            ${renderDatePicker("dateTo", "", "Date Departed (optional)")}
            <p class="depart-hint">Leave blank if unit is still stationed here.</p>
            <div class="form-group"><label>Context</label>
                <select name="context" id="establishContextSelect">${contextOptions}</select>
            </div>
            <div class="form-group" id="newOpGroup" style="display:none">
                <label>Operation Name</label>
                <input type="text" name="newOpName" value="Deployment"/>
            </div>
            <div class="form-group"><label>eventNotes</label><textarea name="description"></textarea></div>
        </form>
    `;

    new Dialog({
        eventTitle: `Deploy: ${unitData.unitName}`,
        content,
        render: (dialogHtml) => {
            activateDatePickers(dialogHtml);
            dialogHtml.find('#establishContextSelect').on('change', (e) => {
                dialogHtml.find('#newOpGroup').toggle(e.target.value === 'new');
            });
            dialogHtml.find('.locate-btn').on('click', async (e) => {
                const btn = $(e.currentTarget);
                const wrap = btn.closest('.input-with-btn');
                btn.find('i').attr('class', 'fas fa-spinner fa-spin');
                const result = await panToLocation(wrap.find('input[name="location"]').val());
                btn.find('i').attr('class', 'fas fa-map-marker-alt');
                if (result) {
                    wrap.find('input[name="lat"]').val(result.lat);
                    wrap.find('input[name="lng"]').val(result.lng);
                    if (result.formattedAddress) wrap.find('input[name="location"]').val(result.formattedAddress);
                }
            });
        },
        buttons: {
            deploy: {
                label: "Deploy",
                icon: '<i class="fas fa-map-marker-alt"></i>',
                callback: async (dialogHtml) => {
                    const fd = new foundry.applications.ux.FormDataExtended(dialogHtml.find('form')[0]).object;
                    let phaseId, opId;
                    const updates = {};

                    if (fd.context === 'new') {
                        phaseId = foundry.utils.randomID();
                        opId = foundry.utils.randomID();
                        updates[`system.phases.${phaseId}`] = {
                            id: phaseId, name: "Active Operations",
                            dateFrom: normalizeDateInput(fd.dateFrom), operations: {}
                        };
                        updates[`system.phases.${phaseId}.operations.${opId}`] = {
                            id: opId, name: fd.newOpName || "Deployment",
                            dateFrom: normalizeDateInput(fd.dateFrom), engagements: {}
                        };
                    } else {
                        [phaseId, opId] = fd.context.split(':');
                    }

                    const eid = foundry.utils.randomID();
                    updates[`system.phases.${phaseId}.operations.${opId}.engagements.${eid}`] = {
                        id: eid,
                        name: fd.name,
                        date: normalizeDateInput(fd.dateFrom),
                        time: fd.timeFrom || '00:00',
                        dateTo: normalizeDateInput(fd.dateTo) || null,
                        timeTo: null,
                        unitId: fd.unitId,
                        eventSpanFromLocation: fd.location,
                        eventSpanFromLat: parseFloat(fd.lat),
                        eventSpanFromLng: parseFloat(fd.lng),
                        description: fd.description || ''
                    };
                    await sheet.actor.update(updates);
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "deploy"
    }, { classes: ["continuum-v2", "dialog"] }).render(true);
}


// --- Unit map marker tooltip content ---
function buildUnitInfoContent(unit, rawData, color) {
    const typeLabels = { physical: 'Physical', espionage: 'Espionage', psyops: 'Psyops', online: 'Online' };
    const label = typeLabels[unit.type] || unit.type;

    const statRow = (lbl, val) => (val !== undefined && val !== null && val !== '')
        ? '<tr><td style="color:#666;padding-right:10px;white-space:nowrap;font-size:11px;">' + lbl + '</td><td style="font-weight:bold;font-size:11px;">' + val + '</td></tr>'
        : '';

    let rows = '';
    if (unit.type === 'physical') {
        rows = [statRow('Size', rawData.size), statRow('Cohesion', rawData.cohesion), statRow('Effectiveness', rawData.effectiveness), statRow('Training', rawData.training), statRow('Experience', rawData.experience)].join('');
    } else if (unit.type === 'espionage') {
        rows = [statRow('Size', rawData.size), statRow('Integrity', rawData.integrity), statRow('Appeal', rawData.appeal), statRow('Training', rawData.training), statRow('Experience', rawData.experience)].join('');
    } else if (unit.type === 'online') {
        rows = [statRow('Allegiance', rawData.type), statRow('L33t', rawData.l33t), statRow('Grok', rawData.grok), statRow('Pwn', rawData.pwn), statRow('Phreak', rawData.phreak)].join('');
    } else if (unit.type === 'psyops') {
        rows = [statRow('Role', rawData.role), statRow('Shade', rawData.shade), statRow('Ruthlessness', rawData.ruthlessness), statRow('Resources', rawData.resources), statRow('Sympathizers', rawData.sympathizers)].join('');
    }

    const cmdr = rawData.commanderName
        ? '<div style="margin-top:5px;padding-top:4px;border-top:1px solid #ddd;font-size:11px;">★ Cmdr: <strong>' + rawData.commanderName + '</strong></div>'
        : '';

    return '<div style="color:#222;min-width:150px;">'
        + '<div style="font-weight:bold;font-size:13px;border-bottom:2px solid ' + color + ';padding-bottom:3px;margin-bottom:4px;">' + unit.name + '</div>'
        + '<div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">' + label + '</div>'
        + (rows ? '<table style="border-collapse:collapse;width:100%;">' + rows + '</table>' : '')
        + cmdr
        + '</div>';
}

// --- Helper Functions ---
function getAllUnits(actor) {
    const units = [];
    const conflict = actor.system.conflict || {};
    const types = ['physical', 'espionage', 'psyops', 'online'];
    types.forEach(type => {
        if (conflict[type]) {
            Object.entries(conflict[type]).forEach(([id, unit]) => {
                if (unit) units.push({ id, name: unit.description || unit.role || unit.type || "Unit", type, raw: unit });
            });
        }
    });
    return units;
}

function getAllEngagements(actor) {
    const engs = [];
    const phases = actor.system.phases || {};
    Object.entries(phases).forEach(([phaseId, phase]) => {
        if (!phase) return;
        Object.entries(phase.operations || {}).forEach(([opId, op]) => {
            if (!op) return;
            Object.entries(op.engagements || {}).forEach(([engId, eng]) => {
                if (eng) engs.push({ ...eng, id: engId, phaseId, opId, opName: op.name });
            });
        });
    });
    return engs;
}

function attachMapLocationListeners(html) {
    html.find('.locate-btn').on('click', async (event) => {
        const button = $(event.currentTarget);
        const input = button.prevAll('input[type="text"]');
        const loc = input.val();
        if (loc) {
            button.find('i').attr('class', 'fas fa-spinner fa-spin');
            const result = await panToLocation(loc);
            button.find('i').attr('class', 'fas fa-map-marker-alt');
            if (result) {
                button.prevAll('input[name="lat"]').val(result.lat);
                button.prevAll('input[name="lng"]').val(result.lng);
                if (result.formattedAddress) input.val(result.formattedAddress);
            }
        }
    });
}

async function showInsertNodeDialog(sheet, unit, p1, p2, lat, lng) {
    let phaseId, opId;
    if (p1.data) { phaseId = p1.data.phaseId; opId = p1.data.opId; }
    else if (p2.data) { phaseId = p2.data.phaseId; opId = p2.data.opId; }
    else return;

    const midTime = (p1.time + p2.time) / 2;
    const d = new Date(midTime);
    const dateStr = d.toISOString().split('T')[0];
    const timeStr = d.toTimeString().split(' ')[0].substring(0, 5);

    const content = `
        <form>
            <div class="form-group"><label>Insert Stop: <strong>${unit.name}</strong></label></div>
            <div class="form-group">
                <label>Location</label>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <input type="text" name="location" value="${lat.toFixed(4)}, ${lng.toFixed(4)}" style="flex: 1;"/>
                    <input type="hidden" name="lat" value="${lat}"/>
                    <input type="hidden" name="lng" value="${lng}"/>
                    <button type="button" class="locate-btn" eventTitle="Locate"><i class="fas fa-map-marker-alt"></i></button>
                </div>
            </div>
            <div class="form-group"><label>Date</label><input type="date" name="date" value="${dateStr}" /></div>
            <div class="form-group"><label>Time</label><input type="time" name="time" value="${timeStr}"/></div>
            <div class="form-group"><label>Description</label><textarea name="description"></textarea></div>
        </form>
    `;

    new Dialog({
        eventTitle: "Insert Engagement",
        content,
        render: (html) => { activateDatePickers(html); attachMapLocationListeners(html); },
        buttons: {
            save: {
                label: "Insert", icon: '<i class="fas fa-map-pin"></i>',
                callback: async (html) => {
                    const fd = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    const id = foundry.utils.randomID();
                    await sheet.actor.update({
                        [`system.phases.${phaseId}.operations.${opId}.engagements.${id}`]: {
                            id, name: `Stop: ${fd.location}`, date: normalizeDateInput(fd.date),
                            time: fd.time, description: fd.description, unitId: unit.id,
                            eventSpanFromLocation: fd.location, eventSpanFromLat: parseFloat(fd.lat), eventSpanFromLng: parseFloat(fd.lng)
                        }
                    });
                }
            },
            cancel: { label: "Cancel" }
        }, default: "save"
    }).render(true);
}

async function showDeploymentDialog(sheet, unit, lat, lng) {
    const sliderDate = new Date(Number.isFinite(currentSliderTime) ? currentSliderTime : Date.now());
    const dateStr = sliderDate.toISOString().split('T')[0];
    const timeStr = sliderDate.toTimeString().split(' ')[0].substring(0, 5);

    let contextOptions = '';
    const phases = sheet.actor.system.phases || {};
    Object.entries(phases).forEach(([pid, p]) => {
        if (!p) return;
        Object.entries(p.operations || {}).forEach(([oid, o]) => {
            if (o) contextOptions += `<option value="${pid}:${oid}">${o.name} (${p.name})</option>`;
        });
    });
    contextOptions += `<option value="new">Start New Operation...</option>`;

    const content = `
        <form>
            <div class="form-group"><label>Deployment: <strong>${unit.name}</strong></label></div>
            <div class="form-group">
                <label>Location</label>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <input type="text" name="location" value="${lat.toFixed(4)}, ${lng.toFixed(4)}" style="flex: 1;"/>
                    <input type="hidden" name="lat" value="${lat}"/>
                    <input type="hidden" name="lng" value="${lng}"/>
                    <button type="button" class="locate-btn" eventTitle="Locate"><i class="fas fa-map-marker-alt"></i></button>
                </div>
            </div>
            <div class="form-group"><label>Date</label><input type="date" name="date" value="${dateStr}" /></div>
            <div class="form-group"><label>Time</label><input type="time" name="time" value="${timeStr}"/></div>
            <div class="form-group"><label>Context</label><select name="context">${contextOptions}</select></div>
            <div class="form-group" id="newOpGroup" style="display:none"><label>New Op Name</label><input type="text" name="newOpName" value="Deployment Op"/></div>
            <div class="form-group"><label>Description</label><textarea name="description"></textarea></div>
        </form>
    `;

    new Dialog({
        eventTitle: `Deploy Unit`,
        content,
        render: (html) => {
            activateDatePickers(html); attachMapLocationListeners(html);
            html.find('select[name="context"]').on('change', (e) => {
                if (e.target.value === 'new') html.find('#newOpGroup').show();
                else html.find('#newOpGroup').hide();
            });
        },
        buttons: {
            save: {
                label: "Deploy", icon: '<i class="fas fa-map-marker-alt"></i>',
                callback: async (html) => {
                    const fd = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    let phaseId, opId;
                    const updates = {};
                    if (fd.context === 'new') {
                        phaseId = foundry.utils.randomID(); opId = foundry.utils.randomID();
                        updates[`system.phases.${phaseId}`] = { id: phaseId, name: "Active Operations", dateFrom: fd.date, operations: {} };
                        updates[`system.phases.${phaseId}.operations.${opId}`] = { id: opId, name: fd.newOpName, dateFrom: fd.date, engagements: {} };
                    } else { [phaseId, opId] = fd.context.split(':'); }
                    const eid = foundry.utils.randomID();
                    updates[`system.phases.${phaseId}.operations.${opId}.engagements.${eid}`] = {
                        id: eid, name: `Deployment: ${unit.name}`, date: normalizeDateInput(fd.date),
                        time: fd.time, description: fd.description, unitId: unit.id,
                        eventSpanFromLocation: fd.location, eventSpanFromLat: parseFloat(fd.lat), eventSpanFromLng: parseFloat(fd.lng)
                    };
                    await sheet.actor.update(updates);
                }
            },
            cancel: { label: "Cancel", callback: () => sheet.render() }
        }, default: "save"
    }).render(true);
}
