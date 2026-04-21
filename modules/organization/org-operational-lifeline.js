/**
 * org-operational-lifeline.js
 *
 * Replaces the old Google-Maps-only Operational Map with a multi-unit lifeline
 * graph that is architecturally identical to the character sheet Lifeline —
 * same SVG structure, same coordinate system, same 30-degree constraint — but
 * renders all org conflict units simultaneously as coloured tracks.
 *
 * KEY DIFFERENCE from character sheet:
 *   • Map layer is the DEFAULT (wrapper starts with .map-mode).
 *   • Graph is the OVERLAY — toggle button / spacebar exposes it.
 *
 * DATA MODEL
 *   X axis (age) = seconds since org inception (subjective age of each unit).
 *   Y axis (time) = milliseconds since epoch (objective calendar date).
 *   1 second subjective == 1 000 ms objective  →  30-degree diagonal.
 *   Each engagement stored in system.phases[*].operations[*].engagements[*]
 *   becomes a node on the unit's trail.
 */

import { LayerManager } from '../lifeline/painters/layer-manager.js';
import { initializeLifelineMap, triggerMapResize, getMapInstance, reverseGeocode, panMapByPixels } from '../span-graph-map.js';
import { GridPainter } from '../lifeline/painters/grid-painter.js';
import { openMandateEditDialog } from './org-dialog-create-mandate.js';
import { openOrgEncounterEditDialog } from './org-dialog-edit-encounter.js';
import { showOrgInsertEncounterDialog } from './org-dialog-insert-encounter.js';
import { drawAgeBlocks } from '../lifeline/painters/draw-age-blocks.js';
import { drawExperienceBlocks } from '../lifeline/painters/draw-experience-blocks.js';
import { generateEras } from '../lifeline/services/segment-generator/generate-ages.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const SECONDS_IN_YEAR = 31_536_000;
const TARGET_RATIO    = -0.00045;   // scaleY / scaleX that yields ~30° visually
const HIT_RADIUS_PX   = 14;        // px snap radius for head-node drag detection
const MIN_DRAG_AGE    = SECONDS_IN_YEAR * 0.01; // ~3.65 days — ignore micro-drags
const svgNS           = 'http://www.w3.org/2000/svg';

const UNIT_COLORS = {
    physical:  '#E32017',
    espionage: '#003688',
    psyops:    '#9B0056',
    online:    '#00782A',
};

// ─── Per-sheet context ────────────────────────────────────────────────────────
const contexts = new WeakMap();

function getContext(sheet) {
    if (!contexts.has(sheet)) {
        contexts.set(sheet, {
            viewState: makeViewState(),
            graphData: { isOrganization: true, tracks: {}, dobTimestamp: 0 },
            unitMarkers: [], // google.maps.Marker instances for unit positions
            connectorSvg: null,  // <svg class="org-lifeline-connector-svg"> element
            activeConnector: null, // { unitId } while a hover is active
        });
    }
    return contexts.get(sheet);
}

function makeViewState() {
    return {
        x: 0, y: 0,
        scaleX: 0.000005,
        scaleY: -0.00000000288,
        initialized: false,
        lastRenderedView: { x: null, y: null, scaleX: null, scaleY: null },
        activeUnitId: null,
        forceRedraw: false,
        // drag-line visual handles (populated at attach time)
        dragLine: null, dragHead: null,
        // subway-painter compatibility shims (unused but referenced by LayerManager)
        scrubber: { active: false },
        isDragging: false,
        activeDragType: null,
        hoveredSegment: null,
        dragTooltip: null,
        // mandate hover / connection-line state
        highlightedMandateId: null,
        hoveredMandateRect:   null,
        isMandateLineFading:  false,
        mandateFadeTimeout:   null,
    };
}

// ─── Data processing ─────────────────────────────────────────────────────────

function buildTracks(actor) {
    const inceptionStr = actor.system.structure?.inceptionDate;
    const inceptionDate = inceptionStr ? new Date(inceptionStr + 'T00:00:00') : null;
    const inceptionTs = (inceptionDate && !isNaN(inceptionDate)) ? inceptionDate.getTime() : Date.now();

    // Index all engagements by unitId
    const engsByUnit = {};
    const phases = actor.system.phases || {};
    for (const [phaseId, phase] of Object.entries(phases)) {
        if (!phase) continue;
        for (const [opId, op] of Object.entries(phase.operations || {})) {
            if (!op) continue;
            for (const [engId, eng] of Object.entries(op.engagements || {})) {
                if (!eng?.unitId) continue;
                const ts = new Date((eng.date || '1970-01-01') + 'T' + (eng.time || '00:00')).getTime();
                if (!Number.isFinite(ts)) continue;
                if (!engsByUnit[eng.unitId]) engsByUnit[eng.unitId] = [];
                engsByUnit[eng.unitId].push({ ...eng, id: engId, phaseId, opId, ts });
            }
        }
    }

    // Build one track per unit
    const tracks = {};
    const conflict = actor.system.conflict || {};
    ['physical', 'espionage', 'psyops', 'online'].forEach(type => {
        const units = conflict[type] || {};
        Object.entries(units).forEach(([unitId, unit]) => {
            if (!unit) return;
            const color = UNIT_COLORS[type] || '#888';
            const name  = unit.description || unit.role || 'Unit';

            // Per-unit inception date (falls back to org inception if unset)
            const unitInceptionDate = unit.inceptionDate
                ? new Date(unit.inceptionDate + 'T00:00:00') : null;
            const unitInceptionTs = (unitInceptionDate && !isNaN(unitInceptionDate))
                ? unitInceptionDate.getTime() : inceptionTs;

            // Birth node (age 0, unit inception time)
            const nodes = [{
                age: 0,
                time: unitInceptionTs,
                type: 'origin',
                outgoingType: 'level',
                unitId,
                label: 'Inception',
            }];

            // Deployment nodes — sorted chronologically
            const engs = (engsByUnit[unitId] || []).sort((a, b) => a.ts - b.ts);
            for (const eng of engs) {
                const elapsed = (eng.ts - unitInceptionTs) / 1000; // subjective seconds
                nodes.push({
                    age:  elapsed,
                    time: eng.ts,
                    type: 'level',
                    outgoingType: 'level',
                    unitId,
                    engId:   eng.id,
                    phaseId: eng.phaseId,
                    opId:    eng.opId,
                    lat: parseFloat(eng.spanFromLat),
                    lng: parseFloat(eng.spanFromLng),
                    label: eng.name || eng.spanFromLocation || '',
                    linkedMandateIds: Array.isArray(eng.linkedMandateIds) ? eng.linkedMandateIds : [],
                });
            }

            // Head node — last known position (the draggable "now")
            const last = nodes[nodes.length - 1];
            const headNode = {
                age:    last.age,
                time:   last.time,
                type:   'now',
                unitId,
                isHead: true,
            };

            tracks[unitId] = { id: unitId, name, type, color, nodes, headNode, logo: unit.logo || null };
        });
    });

    return { tracks, inceptionTs };
}

function processData(sheet, graphData) {
    const { tracks, inceptionTs } = buildTracks(sheet.actor);
    graphData.tracks       = tracks;
    graphData.dobTimestamp = inceptionTs;
    // nowNode: current moment expressed in org-age (seconds since inception)
    const nowMs = Date.now();
    graphData.nowNode      = { age: (nowMs - inceptionTs) / 1000, time: nowMs };
    graphData.levelNodes   = [];
    graphData.experienceSegments = []; // replaced after rawEras below
    graphData.goalNodes    = [];
    graphData.remainingSpanSeconds = Infinity;
    graphData.mandateNodes = Object.entries(sheet.actor.system.mandates || {}).map(([id, m]) => ({
        id, importance: m.importance, description: m.description,
    }));

    // Era periods: same system.eras field used by character sheets.
    // generateEras() converts dateFrom/dateTo + age offset into startAgeSeconds/endAgeSeconds.
    const rawEras = Object.values(sheet.actor.system.eras || {})
        .sort((a, b) => (a.sort || 0) - (b.sort || 0));
    graphData.eras = rawEras.length ? generateEras(rawEras) : [];
    graphData.experienceSegments = generateOrgOperations(rawEras, inceptionTs);
}

// ─── Viewport fit ─────────────────────────────────────────────────────────────

function fitToView(svg, viewState, graphData) {
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    let minAge = Infinity, maxAge = -Infinity;
    let minTime = Infinity, maxTime = -Infinity;

    for (const track of Object.values(graphData.tracks)) {
        const allNodes = [...track.nodes, ...(track.headNode ? [track.headNode] : [])];
        for (const n of allNodes) {
            if (n.age < minAge)  minAge  = n.age;
            if (n.age > maxAge)  maxAge  = n.age;
            if (n.time < minTime) minTime = n.time;
            if (n.time > maxTime) maxTime = n.time;
        }
    }

    if (!Number.isFinite(minAge)) {
        const now = Date.now();
        minAge = 0; maxAge = SECONDS_IN_YEAR * 5;
        minTime = graphData.dobTimestamp; maxTime = now;
    }

    // Pad 10% each side
    const PAD = 0.15;
    const dataW = Math.max(maxAge  - minAge,  SECONDS_IN_YEAR)     * (1 + PAD * 2);
    const dataH = Math.max(maxTime - minTime, SECONDS_IN_YEAR * 1e3) * (1 + PAD * 2);

    const sxW = rect.width  / dataW;
    const sxH = rect.height / (dataH * Math.abs(TARGET_RATIO));
    const newScaleX = Math.min(sxW, sxH) * 0.85;
    const newScaleY = newScaleX * TARGET_RATIO;

    viewState.scaleX = newScaleX;
    viewState.scaleY = newScaleY;
    viewState.x = rect.width  * PAD - (minAge  * newScaleX);
    viewState.y = rect.height * (1 - PAD) - (maxTime * newScaleY);
    viewState.initialized = true;
}

// ─── Rendering ────────────────────────────────────────────────────────────────

const MANDATE_COLORS = {
    Critical: '#ff6b6b', Extreme: '#ff6b6b',
    Important: '#ffd93d',
    Mild: '#a0c4ff', Passing: '#a0c4ff',
};

function drawMandateConnections(svg, viewState, graphData) {
    let group = svg.querySelector('.graph-mandate-connections-layer');
    if (!group) {
        group = document.createElementNS(svgNS, 'g');
        group.classList.add('graph-mandate-connections-layer');
        const nodesGroup = svg.querySelector('.graph-nodes-group');
        if (nodesGroup?.parentNode) nodesGroup.parentNode.insertBefore(group, nodesGroup);
        else svg.appendChild(group);
    }
    group.innerHTML = '';
    if (!viewState.highlightedMandateId || !viewState.hoveredMandateRect) return;

    const mandateId   = viewState.highlightedMandateId;
    const mandateData = graphData.mandateNodes?.find(m => m.id === mandateId);
    if (!mandateData) return;

    const svgRect = svg.getBoundingClientRect();
    const mRect   = viewState.hoveredMandateRect;
    const mx = (mRect.left + mRect.width  / 2) - svgRect.left;
    const my = (mRect.top  + mRect.height / 2) - svgRect.top;
    const stroke = MANDATE_COLORS[mandateData.importance] || '#ffffff';

    for (const track of Object.values(graphData.tracks || {})) {
        for (const node of track.nodes) {
            if (!node.linkedMandateIds?.includes(mandateId)) continue;
            const nx = node.age  * viewState.scaleX + viewState.x;
            const ny = node.time * viewState.scaleY + viewState.y;
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', mx); line.setAttribute('y1', my);
            line.setAttribute('x2', nx); line.setAttribute('y2', ny);
            line.classList.add('goal-connection-line');
            if (viewState.isMandateLineFading) line.classList.add('fading');
            line.setAttribute('stroke', stroke);
            group.appendChild(line);
        }
    }
}

// ─── Cross-layer connector lines ──────────────────────────────────────────────

/**
 * Converts a lat/lng to pixel coordinates within the map container
 * (and by extension, the connector SVG which shares the same wrapper bounds).
 *
 * Uses map.getCenter() rather than map.getBounds() because getBounds() returns
 * null until the map fires its first 'idle' event — which hasn't happened yet
 * when the user hovers an SVG node in graph mode. getCenter() is always set.
 */
function latLngToPixel(map, lat, lng) {
    const proj = map.getProjection();
    if (!proj) return null;
    const center = map.getCenter();
    if (!center) return null;
    const scale       = Math.pow(2, map.getZoom());
    const centerWorld = proj.fromLatLngToPoint(center);
    const targetWorld = proj.fromLatLngToPoint(new window.google.maps.LatLng(lat, lng));
    const mapDiv      = map.getDiv();
    return {
        x: (targetWorld.x - centerWorld.x) * scale + mapDiv.offsetWidth  / 2,
        y: (targetWorld.y - centerWorld.y) * scale + mapDiv.offsetHeight / 2,
    };
}

/** Returns {x, y} center of a .subway-node SVG element. */
function getNodeElementCenter(el) {
    if (el.tagName.toLowerCase() === 'circle') {
        return { x: parseFloat(el.getAttribute('cx')) || 0, y: parseFloat(el.getAttribute('cy')) || 0 };
    }
    // <image>: x/y is top-left
    const x = parseFloat(el.getAttribute('x')) || 0;
    const y = parseFloat(el.getAttribute('y')) || 0;
    const w = parseFloat(el.getAttribute('width'))  || 0;
    const h = parseFloat(el.getAttribute('height')) || 0;
    return { x: x + w / 2, y: y + h / 2 };
}

function clearConnectorLines(connectorSvg) {
    if (connectorSvg) connectorSvg.innerHTML = '';
}

function drawConnectorLine(connectorSvg, x1, y1, x2, y2, color) {
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.classList.add('org-connector-line');
    line.setAttribute('stroke', color || 'rgba(255,255,255,0.7)');
    connectorSvg.appendChild(line);
}

/**
 * Called when an SVG timeline node is hovered.
 * Draws a dashed line from the hovered node to the unit's current map marker position.
 */
function drawConnectorFromSvgNode(connectorSvg, nodeEl, graphData, map) {
    clearConnectorLines(connectorSvg);
    if (!connectorSvg || !map || !window.google?.maps) return;

    const unitId = nodeEl.dataset.unitId;
    const track  = graphData.tracks?.[unitId];
    if (!track) return;

    // Find the last engagement with a known location
    const locatedNodes = track.nodes.filter(n => n.type === 'level' && Number.isFinite(n.lat) && Number.isFinite(n.lng));
    if (!locatedNodes.length) return;
    const lastLocated = locatedNodes[locatedNodes.length - 1];

    const markerPx = latLngToPixel(map, lastLocated.lat, lastLocated.lng);
    if (!markerPx) return;

    const nodeCenter = getNodeElementCenter(nodeEl);
    drawConnectorLine(connectorSvg, nodeCenter.x, nodeCenter.y, markerPx.x, markerPx.y, track.color);
}

/**
 * Called when a map unit marker is hovered.
 * Draws dashed lines from the marker to ALL SVG nodes for that unit.
 */
function drawConnectorFromMapMarker(connectorSvg, track, markerLat, markerLng, svg, viewState, map) {
    clearConnectorLines(connectorSvg);
    if (!connectorSvg || !map || !window.google?.maps) return;

    const markerPx = latLngToPixel(map, markerLat, markerLng);
    if (!markerPx) return;

    // Draw a line from the map marker to each node (origin + engagements + head) on the SVG
    const allNodes = [...track.nodes, ...(track.headNode ? [track.headNode] : [])];
    for (const node of allNodes) {
        const nx = node.age  * viewState.scaleX + viewState.x;
        const ny = node.time * viewState.scaleY + viewState.y;
        drawConnectorLine(connectorSvg, markerPx.x, markerPx.y, nx, ny, track.color);
    }
}

// ─── Segment hover helpers ────────────────────────────────────────────────────

/**
 * Finds the closest track segment within `hitPx` pixels of (sx, sy).
 * Returns a segment descriptor or null.
 */
function findHoveredSegment(sx, sy, graphData, viewState, hitPx = 15) {
    let best = null;
    let minDist = hitPx;

    for (const track of Object.values(graphData.tracks || {})) {
        const allPts = [...track.nodes];
        // Include headNode only if it isn't co-located with the last engagement
        if (track.headNode) {
            const last = allPts[allPts.length - 1];
            if (last.age !== track.headNode.age || last.time !== track.headNode.time) {
                allPts.push(track.headNode);
            }
        }

        for (let i = 0; i < allPts.length - 1; i++) {
            const nA = allPts[i], nB = allPts[i + 1];
            const ax = nA.age  * viewState.scaleX + viewState.x;
            const ay = nA.time * viewState.scaleY + viewState.y;
            const bx = nB.age  * viewState.scaleX + viewState.x;
            const by = nB.time * viewState.scaleY + viewState.y;

            const dx = bx - ax, dy = by - ay;
            const l2 = dx * dx + dy * dy;
            if (l2 < 1) continue; // zero-length segment

            let t = ((sx - ax) * dx + (sy - ay) * dy) / l2;
            t = Math.max(0, Math.min(1, t));

            const projX = ax + t * dx;
            const projY = ay + t * dy;
            const dist  = Math.hypot(sx - projX, sy - projY);

            if (dist < minDist) {
                minDist = dist;
                best = {
                    trackId:   track.id,
                    track,
                    nodeA:     nA,
                    nodeB:     nB,
                    worldAge:  nA.age  + t * (nB.age  - nA.age),
                    worldTime: nA.time + t * (nB.time - nA.time),
                    screenX:   projX,
                    screenY:   projY,
                };
            }
        }
    }

    return best;
}

/**
 * Adds/moves/removes the insert ghost circle in the SVG nodes group.
 * Called by render() after every redraw so the ghost stays in sync.
 */
function updateInsertGhost(svg, viewState) {
    const nodesGroup = svg.querySelector('.graph-nodes-group');
    if (!nodesGroup) return;

    // Always remove the stale ghost — SubwayPainter rebuilds the nodes group
    // each render so any existing ghost is gone; we just re-add if needed.
    const existing = nodesGroup.querySelector('.graph-node-insert-ghost');
    if (existing) existing.remove();

    const seg = viewState.hoveredSegment;
    if (!seg) return;

    const ghost = document.createElementNS(svgNS, 'circle');
    ghost.classList.add('graph-node-insert-ghost');
    ghost.setAttribute('cx', seg.screenX);
    ghost.setAttribute('cy', seg.screenY);
    ghost.setAttribute('r', '6');
    ghost.style.fill        = seg.track.color;
    ghost.style.stroke      = '#fff';
    ghost.style.strokeWidth = '2';
    ghost.style.pointerEvents = 'none';
    nodesGroup.appendChild(ghost);
}

function render(svg, viewState, graphData) {
    LayerManager.render(svg, viewState, graphData);
    // LayerManager skips age/experience blocks for org mode — call them explicitly.
    drawAgeBlocks(svg.querySelector('.graph-ages-layer'), viewState, graphData);
    drawExperienceBlocks(svg.querySelector('.graph-experiences-layer'), viewState, graphData);
    drawMandateConnections(svg, viewState, graphData);
    // Restore the insert ghost after SubwayPainter has rebuilt the nodes group.
    updateInsertGhost(svg, viewState);
    viewState.lastRenderedView = {
        x: viewState.x, y: viewState.y,
        scaleX: viewState.scaleX, scaleY: viewState.scaleY,
    };
}

// ─── Drag helpers ─────────────────────────────────────────────────────────────

function findHeadHit(sx, sy, graphData, viewState) {
    for (const [id, track] of Object.entries(graphData.tracks)) {
        if (!track.headNode) continue;
        const hx = track.headNode.age  * viewState.scaleX + viewState.x;
        const hy = track.headNode.time * viewState.scaleY + viewState.y;
        if (Math.hypot(sx - hx, sy - hy) <= HIT_RADIUS_PX) return { id, track };
    }
    return null;
}

/**
 * Creates a new engagement for a unit.
 * @param {Object}      sheet
 * @param {string}      unitId
 * @param {string}      dateStr   - "YYYY-MM-DD"
 * @param {string}      timeStr   - "HH:MM"
 * @param {Object|null} location  - Optional { lat, lng, name } for location-first flow
 */
async function saveNewEngagement(sheet, unitId, dateStr, timeStr, location = null) {
    const actor  = sheet.actor;
    const phases = actor.system.phases || {};
    const updates = {};

    // Re-use the most recently created phase/op if one exists, otherwise create
    let phaseId = null, opId = null;
    let latestDate = 0;
    for (const [pid, phase] of Object.entries(phases)) {
        if (!phase) continue;
        const d = phase.dateFrom ? new Date(phase.dateFrom).getTime() : 0;
        if (d >= latestDate && Object.keys(phase.operations || {}).length > 0) {
            latestDate = d;
            phaseId = pid;
            opId = Object.keys(phase.operations)[0];
        }
    }

    if (!phaseId) {
        phaseId = foundry.utils.randomID();
        opId    = foundry.utils.randomID();
        updates[`system.phases.${phaseId}`] = {
            id: phaseId, name: 'Active Operations', dateFrom: dateStr,
            operations: {
                [opId]: { id: opId, name: 'Operations', dateFrom: dateStr, engagements: {} }
            }
        };
    }

    const eid = foundry.utils.randomID();
    updates[`system.phases.${phaseId}.operations.${opId}.engagements.${eid}`] = {
        id: eid, unitId,
        name:             location?.name || `Deployment ${dateStr}`,
        date: dateStr,    time: timeStr,
        spanFromLat:      location?.lat  ?? null,
        spanFromLng:      location?.lng  ?? null,
        spanFromLocation: location?.name ?? '',
        description: '',
    };

    await actor.update(updates);
}

// ─── Age period dialog ────────────────────────────────────────────────────────

function showOrgAgeDialog(sheet, graphData, startAgeSecs, endAgeSecs) {
    const inceptionTs = graphData.dobTimestamp;
    const toISO = ts => {
        const d = new Date(ts);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };
    const startDate = toISO(inceptionTs + startAgeSecs * 1000);
    const endDate   = toISO(inceptionTs + endAgeSecs   * 1000);

    new Dialog({
        title: 'Create Phase Period',
        content: `
            <form autocomplete="off" style="display:grid; grid-template-columns:100px 1fr; align-items:center; gap:8px 12px; padding:4px 0;">
                <label style="text-align:right;">Name</label>
                <input type="text" name="name" value="New Period" autofocus/>
                <label style="text-align:right;">Start Date</label>
                <input type="date" name="dateFrom" value="${startDate}"/>
                <label style="text-align:right;">End Date</label>
                <input type="date" name="dateTo" value="${endDate}"/>
            </form>
        `,
        buttons: {
            create: {
                label: 'Create',
                icon: '<i class="fas fa-check"></i>',
                callback: async (html) => {
                    const fd = new foundry.applications.ux.FormDataExtended(html.find('form')[0]).object;
                    const newId = foundry.utils.randomID();
                    const existing = Object.values(sheet.actor.system.eras || {});
                    const maxSort = existing.length ? Math.max(...existing.map(a => Number(a.sort) || 0)) : 0;
                    await sheet.actor.update({
                        [`system.eras.${newId}`]: {
                            id:         newId,
                            name:       fd.name || 'New Period',
                            dateFrom:   fd.dateFrom || '',
                            dateTo:     fd.dateTo   || '',
                            age:        startAgeSecs,
                            experiences: {},
                            sort:       maxSort + 1000,
                        }
                    });
                }
            },
            cancel: { label: 'Cancel' }
        },
        default: 'create',
    }, { classes: ['continuum-v2', 'dialog'], width: 380 }).render(true);
}

// ─── Operations (Experience equivalent for org sheet) ─────────────────────────

/**
 * Converts raw system.eras entries (with nested experiences) into
 * experienceSegments compatible with draw-experience-blocks.js.
 * Uses (dateMs - inceptionTs) / 1000 instead of mapDateToSubjective().
 */
function generateOrgOperations(rawEras, inceptionTs) {
    const segments = [];
    const nowMs = Date.now();
    for (const era of rawEras) {
        for (const exp of Object.values(era.experiences || {})) {
            if (!exp?.dateFrom) continue;
            const startMs = new Date(exp.dateFrom + 'T00:00:00').getTime();
            if (!Number.isFinite(startMs)) continue;
            const startAge = (startMs - inceptionTs) / 1000;
            let endMs, endAge, isClosed;
            if (exp.isOngoing || !exp.dateTo) {
                endMs = nowMs; endAge = (nowMs - inceptionTs) / 1000; isClosed = false;
            } else {
                endMs = new Date(exp.dateTo + 'T23:59:59').getTime();
                endAge = (endMs - inceptionTs) / 1000; isClosed = true;
            }
            segments.push({
                eraId: era.id, expId: exp.id, name: exp.name || 'Operation',
                startAge, endAge, startTime: startMs, endTime: endMs,
                isClosed, isOngoing: !!exp.isOngoing,
            });
        }
    }
    return segments;
}

function showOrgOperationCreateDialog(sheet, eraId, startAgeSecs, endAgeSecs, inceptionTs) {
    const toISO = ts => {
        const d = new Date(ts);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };
    const startDate = toISO(inceptionTs + startAgeSecs * 1000);
    const endDate   = toISO(inceptionTs + endAgeSecs   * 1000);

    new Dialog({
        title: 'Create Operation',
        content: `
            <form autocomplete="off" style="display:grid; grid-template-columns:100px 1fr; align-items:center; gap:8px 12px; padding:4px 0;">
                <label style="text-align:right;">Name</label>
                <input type="text" name="name" value="New Operation" autofocus/>
                <label style="text-align:right;">Start Date</label>
                <input type="date" name="dateFrom" value="${startDate}"/>
                <label style="text-align:right;">End Date</label>
                <input type="date" name="dateTo" value="${endDate}"/>
                <label style="text-align:right;">Ongoing</label>
                <input type="checkbox" name="isOngoing"/>
                <label style="text-align:right; align-self:start; padding-top:4px;">Description</label>
                <textarea name="description" rows="3" style="resize:vertical;"></textarea>
            </form>
        `,
        buttons: {
            create: {
                label: 'Create', icon: '<i class="fas fa-check"></i>',
                callback: async (html) => {
                    const fd = new foundry.applications.ux.FormDataExtended(html.find('form')[0]).object;
                    const newId = foundry.utils.randomID();
                    const existing = Object.values(sheet.actor.system.eras?.[eraId]?.experiences || {});
                    const maxSort = existing.length ? Math.max(...existing.map(e => Number(e.sort) || 0)) : 0;
                    await sheet.actor.update({
                        [`system.eras.${eraId}.experiences.${newId}`]: {
                            id: newId, name: fd.name || 'New Operation',
                            dateFrom: fd.dateFrom || '', dateTo: fd.dateTo || '',
                            isOngoing: !!fd.isOngoing, description: fd.description || '',
                            events: {}, sort: maxSort + 1000,
                        }
                    });
                }
            },
            cancel: { label: 'Cancel' }
        },
        default: 'create',
    }, { classes: ['continuum-v2', 'dialog'], width: 380 }).render(true);
}

function openOrgOperationEditDialog(sheet, eraId, expId, exp) {
    new Dialog({
        title: 'Edit Operation',
        content: `
            <form autocomplete="off" style="display:grid; grid-template-columns:100px 1fr; align-items:center; gap:8px 12px; padding:4px 0;">
                <label style="text-align:right;">Name</label>
                <input type="text" name="name" value="${exp.name || ''}" autofocus/>
                <label style="text-align:right;">Start Date</label>
                <input type="date" name="dateFrom" value="${exp.dateFrom || ''}"/>
                <label style="text-align:right;">End Date</label>
                <input type="date" name="dateTo" value="${exp.dateTo || ''}"/>
                <label style="text-align:right;">Ongoing</label>
                <input type="checkbox" name="isOngoing" ${exp.isOngoing ? 'checked' : ''}/>
                <label style="text-align:right; align-self:start; padding-top:4px;">Description</label>
                <textarea name="description" rows="3" style="resize:vertical;">${exp.description || ''}</textarea>
            </form>
        `,
        buttons: {
            save: {
                label: 'Save', icon: '<i class="fas fa-save"></i>',
                callback: async (html) => {
                    const fd = new foundry.applications.ux.FormDataExtended(html.find('form')[0]).object;
                    await sheet.actor.update({
                        [`system.eras.${eraId}.experiences.${expId}.name`]:        fd.name || '',
                        [`system.eras.${eraId}.experiences.${expId}.dateFrom`]:    fd.dateFrom || '',
                        [`system.eras.${eraId}.experiences.${expId}.dateTo`]:      fd.dateTo || '',
                        [`system.eras.${eraId}.experiences.${expId}.isOngoing`]:   !!fd.isOngoing,
                        [`system.eras.${eraId}.experiences.${expId}.description`]: fd.description || '',
                    });
                }
            },
            delete: {
                label: 'Delete', icon: '<i class="fas fa-trash"></i>',
                callback: async () => {
                    await sheet.actor.update({ [`system.eras.${eraId}.experiences.-=${expId}`]: null });
                }
            },
            cancel: { label: 'Cancel' }
        },
        default: 'save',
    }, { classes: ['continuum-v2', 'dialog'], width: 380 }).render(true);
}

/*
Called when the user clicks (without dragging) on an engagement node.
Opens the full "Edit Encounter" dialog with Operation context panel.
*/
function handleEngagementClick(nodeEl, sheet, graphData) {
    const engId = nodeEl.getAttribute('data-eng-id');
    if (!engId) return;

    let engNode = null;
    for (const track of Object.values(graphData.tracks || {})) {
        engNode = track.nodes.find(n => n.engId === engId);
        if (engNode) break;
    }
    if (!engNode) return;

    openOrgEncounterEditDialog(sheet, engNode, graphData);
}

// ─── Interaction ──────────────────────────────────────────────────────────────

function attachListeners(svg, sheet, viewState, graphData, context, mapActorKey) {
    const $svg    = $(svg);
    const html    = sheet.element;
    const wrapper = html.find('.org-lifeline-wrapper');
    const toggleBtn = html.find('.org-lifeline-toggle-map');

    const dragLineEl   = svg.querySelector('.graph-drag-line');
    const dragHeadEl   = svg.querySelector('.graph-drag-head');

    $svg.off('.orgLifeline');
    $(document).off('.orgLifelineGlobal');

    let drag = null;

    // ── Prevent context menu on right-click ──────────────────────────────────
    $svg.on('contextmenu.orgLifeline', (ev) => ev.preventDefault());

    // ── Wheel zoom (always active — zooms the SVG timeline) ───────────────────
    $svg.on('wheel.orgLifeline', (ev) => {
        ev.preventDefault();
        const e = ev.originalEvent;
        const rect = svg.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const f  = e.deltaY < 0 ? 1.1 : 0.9;
        const wx = (mx - viewState.x) / viewState.scaleX;
        const wy = (my - viewState.y) / viewState.scaleY;
        viewState.scaleX *= f;
        viewState.scaleY *= f;
        viewState.x = mx - wx * viewState.scaleX;
        viewState.y = my - wy * viewState.scaleY;
        requestAnimationFrame(() => render(svg, viewState, graphData));
    });

    // ── Pointer down ──────────────────────────────────────────────────────────
    // Left-drag  (button 0) → always pans/interacts with the SVG timeline.
    // Right-drag (button 2) → always pans the Google Map.
    $svg.on('pointerdown.orgLifeline', (ev) => {
        const e = ev.originalEvent || ev;

        if (e.button === 2) {
            // Right-drag: pan the Google Map regardless of mode
            drag = { mode: 'mapPan', prevClientX: e.clientX, prevClientY: e.clientY };
            svg.setPointerCapture(e.pointerId);
            return;
        }
        if (e.button !== 0) return;

        const rect = svg.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        const hit = findHeadHit(sx, sy, graphData, viewState);
        if (hit) {
            // Left-drag from head node → deploy new engagement
            drag = {
                mode: 'create',
                unitId: hit.id,
                track:  hit.track,
                startAge:  hit.track.headNode.age,
                startTime: hit.track.headNode.time,
                currentAge: null, currentTime: null,
            };
        } else if (viewState.hoveredSegment) {
            // Left-click on segment → insert encounter (drag = pan)
            drag = {
                mode: 'insertSegment',
                startSX: sx, startSY: sy,
                startVX: viewState.x, startVY: viewState.y,
                hasMoved: false,
            };
        } else {
            // Left-drag on empty space → pan the SVG timeline
            drag = {
                mode: 'pan',
                startSX: sx, startSY: sy,
                startVX: viewState.x, startVY: viewState.y,
                startTarget: e.target,
                hasMoved: false,
            };
        }
        svg.setPointerCapture(e.pointerId);
    });

    // ── Pointer move ──────────────────────────────────────────────────────────
    $svg.on('pointermove.orgLifeline', (ev) => {
        if (!drag) return;
        const e = ev.originalEvent || ev;

        if (drag.mode === 'mapPan') {
            const dx = e.clientX - drag.prevClientX;
            const dy = e.clientY - drag.prevClientY;
            drag.prevClientX = e.clientX;
            drag.prevClientY = e.clientY;
            panMapByPixels(dx, dy, mapActorKey);
            return;
        }

        const rect = svg.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        if (drag.mode === 'pan' || drag.mode === 'insertSegment') {
            if (Math.hypot(sx - drag.startSX, sy - drag.startSY) > 4) drag.hasMoved = true;
            viewState.x = drag.startVX + (sx - drag.startSX);
            viewState.y = drag.startVY + (sy - drag.startSY);
            requestAnimationFrame(() => render(svg, viewState, graphData));
            return;
        }

        // Create mode — constrain to 30-degree diagonal from head
        const rawAge  = (sx - viewState.x) / viewState.scaleX;
        const dAge    = Math.max(0, rawAge - drag.startAge);
        const cAge    = drag.startAge + dAge;
        const cTime   = drag.startTime + dAge * 1000; // 1 s subjective = 1 000 ms objective

        drag.currentAge  = cAge;
        drag.currentTime = cTime;

        const x1 = drag.startAge  * viewState.scaleX + viewState.x;
        const y1 = drag.startTime * viewState.scaleY + viewState.y;
        const x2 = cAge  * viewState.scaleX + viewState.x;
        const y2 = cTime * viewState.scaleY + viewState.y;

        dragLineEl.setAttribute('x1', x1); dragLineEl.setAttribute('y1', y1);
        dragLineEl.setAttribute('x2', x2); dragLineEl.setAttribute('y2', y2);
        dragLineEl.setAttribute('display', 'block');
        dragLineEl.style.stroke = drag.track.color;

        dragHeadEl.setAttribute('cx', x2); dragHeadEl.setAttribute('cy', y2);
        dragHeadEl.setAttribute('display', 'block');
        dragHeadEl.style.stroke = drag.track.color;
        dragHeadEl.style.fill   = drag.track.color;
    });

    // ── Pointer up / leave ────────────────────────────────────────────────────
    $svg.on('pointerup.orgLifeline pointerleave.orgLifeline', async (ev) => {
        if (!drag) return;
        const e = ev.originalEvent || ev;

        if (drag.mode === 'mapPan') {
            drag = null;
            try { svg.releasePointerCapture(e.pointerId); } catch (_) {}
            return;
        }

        if (drag.mode === 'insertSegment' && !drag.hasMoved && viewState.hoveredSegment) {
            // Clean click on a segment — open the insert dialog
            const segSnap = { ...viewState.hoveredSegment }; // snapshot before cleanup
            dragLineEl.setAttribute('display', 'none');
            dragHeadEl.setAttribute('display', 'none');
            drag = null;
            try { svg.releasePointerCapture(e.pointerId); } catch (_) {}
            showOrgInsertEncounterDialog(segSnap, sheet, graphData, () => {
                viewState.hoveredSegment = null;
                render(svg, viewState, graphData);
            });
            return;
        }

        if (drag.mode === 'pan' && !drag.hasMoved && drag.startTarget) {
            const t = drag.startTarget;
            const nodeEl = t.hasAttribute?.('data-eng-id') ? t : t.closest?.('[data-eng-id]');
            if (nodeEl) handleEngagementClick(nodeEl, sheet, graphData);
        }

        if (drag.mode === 'create' && drag.currentAge != null) {
            const dAge = drag.currentAge - drag.startAge;
            if (dAge >= MIN_DRAG_AGE) {
                const d       = new Date(drag.currentTime);
                const dateStr = d.toISOString().split('T')[0];
                const timeStr = d.toTimeString().split(' ')[0].substring(0, 5);
                await saveNewEngagement(sheet, drag.unitId, dateStr, timeStr);
                // Data re-processes on next render (actor update triggers sheet render)
            }
        }

        dragLineEl.setAttribute('display', 'none');
        dragHeadEl.setAttribute('display', 'none');
        drag = null;
        try { svg.releasePointerCapture(e.pointerId); } catch (_) {}
    });

    // ── Spacebar: hold to expose graph while in map-default mode ─────────────
    $(document).on('keydown.orgLifelineGlobal', (e) => {
        if (e.key !== ' ' || e.repeat) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (!wrapper.is(':hover')) return;
        e.preventDefault();
        wrapper.removeClass('map-mode');
        toggleBtn.addClass('active');
    });
    $(document).on('keyup.orgLifelineGlobal', (e) => {
        if (e.key !== ' ') return;
        wrapper.addClass('map-mode');
        toggleBtn.removeClass('active');
    });

    // ── Toggle button: click to lock graph mode on/off ────────────────────────
    toggleBtn.off('.orgLifeline').on('click.orgLifeline', (e) => {
        e.preventDefault();
        wrapper.toggleClass('map-mode');
        toggleBtn.toggleClass('active');
    });

    // ── Reset view button ─────────────────────────────────────────────────────
    html.find('.org-lifeline-reset-view').off('.orgLifeline').on('click.orgLifeline', (e) => {
        e.preventDefault();
        viewState.initialized = false;
        fitToView(svg, viewState, graphData);
        render(svg, viewState, graphData);
    });

    // ── Age period creation strip ─────────────────────────────────────────────
    // Drag left→right on the strip to define a new Age period.
    // New ages always start from the last age's end, preventing overlaps.
    const ageStripEl = svg.querySelector('.org-age-strip');
    const ageGhostEl = svg.querySelector('.org-age-ghost');
    let ageDrag = null;

    if (ageStripEl) {
        ageStripEl.addEventListener('pointerdown', (e) => {
            e.stopPropagation(); // don't trigger SVG pan/drag
            const startAgeSecs = graphData.eras.length
                ? graphData.eras[graphData.eras.length - 1].endAgeSeconds
                : 0;
            const startX = startAgeSecs * viewState.scaleX + viewState.x;
            ageDrag = { startAgeSecs, startX, currentAgeSecs: startAgeSecs };
            if (ageGhostEl) {
                ageGhostEl.setAttribute('x', startX);
                ageGhostEl.setAttribute('width', 0);
                ageGhostEl.setAttribute('display', 'block');
            }
            ageStripEl.setPointerCapture?.(e.pointerId);
        });

        ageStripEl.addEventListener('pointermove', (e) => {
            if (!ageDrag) return;
            const rect = svg.getBoundingClientRect();
            const sx   = e.clientX - rect.left;
            const currentAgeSecs = Math.max(ageDrag.startAgeSecs, (sx - viewState.x) / viewState.scaleX);
            ageDrag.currentAgeSecs = currentAgeSecs;
            if (ageGhostEl) {
                const x2 = currentAgeSecs * viewState.scaleX + viewState.x;
                ageGhostEl.setAttribute('x',     ageDrag.startX);
                ageGhostEl.setAttribute('width', Math.max(0, x2 - ageDrag.startX));
            }
        });

        ageStripEl.addEventListener('pointerup', async (e) => {
            if (!ageDrag) return;
            const { startAgeSecs, currentAgeSecs } = ageDrag;
            ageDrag = null;
            if (ageGhostEl) ageGhostEl.setAttribute('display', 'none');
            try { ageStripEl.releasePointerCapture(e.pointerId); } catch (_) {}
            if (currentAgeSecs - startAgeSecs < 86400) return; // require at least 1 day
            showOrgAgeDialog(sheet, graphData, startAgeSecs, currentAgeSecs);
        });

        ageStripEl.addEventListener('pointercancel', () => {
            ageDrag = null;
            if (ageGhostEl) ageGhostEl.setAttribute('display', 'none');
        });
    }

    // ── Operation label click → edit dialog ──────────────────────────────────
    $svg.on('click.orgLifeline', (ev) => {
        const target = ev.originalEvent?.target || ev.target;
        if (!target.classList.contains('graph-exp-label')) return;
        const expId = target.getAttribute('data-id');
        const eraId = target.getAttribute('data-era-id');
        if (!expId || !eraId) return;
        const exp = sheet.actor.system.eras?.[eraId]?.experiences?.[expId];
        if (exp) openOrgOperationEditDialog(sheet, eraId, expId, exp);
    });

    // ── Operation creation strip ──────────────────────────────────────────────
    // Drag left→right (or right→left) on the strip to define an Operation.
    // The drag range must fall within an existing Phase Period.
    const opStripEl = svg.querySelector('.org-operation-strip');
    const opGhostEl = svg.querySelector('.org-operation-ghost');
    let opDrag = null;

    if (opStripEl) {
        opStripEl.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            const rect = svg.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const startAgeSecs = (sx - viewState.x) / viewState.scaleX;
            opDrag = { startAgeSecs, startX: sx, currentAgeSecs: startAgeSecs };
            if (opGhostEl) {
                opGhostEl.setAttribute('x', sx);
                opGhostEl.setAttribute('width', 0);
                opGhostEl.setAttribute('display', 'block');
            }
            opStripEl.setPointerCapture?.(e.pointerId);
        });

        opStripEl.addEventListener('pointermove', (e) => {
            if (!opDrag) return;
            const rect = svg.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            opDrag.currentAgeSecs = (sx - viewState.x) / viewState.scaleX;
            if (opGhostEl) {
                const x1 = Math.min(opDrag.startX, sx);
                const x2 = Math.max(opDrag.startX, sx);
                opGhostEl.setAttribute('x', x1);
                opGhostEl.setAttribute('width', Math.max(0, x2 - x1));
            }
        });

        opStripEl.addEventListener('pointerup', async (e) => {
            if (!opDrag) return;
            const { startAgeSecs, currentAgeSecs } = opDrag;
            opDrag = null;
            if (opGhostEl) opGhostEl.setAttribute('display', 'none');
            try { opStripEl.releasePointerCapture(e.pointerId); } catch (_) {}

            const minAge = Math.min(startAgeSecs, currentAgeSecs);
            const maxAge = Math.max(startAgeSecs, currentAgeSecs);
            if (maxAge - minAge < 86400) return; // require at least 1 day

            const midAge = (minAge + maxAge) / 2;
            const matchingPhase = graphData.eras.find(a =>
                midAge >= a.startAgeSeconds && midAge <= a.endAgeSeconds
            );
            if (!matchingPhase) {
                ui.notifications.warn('Drag within a Phase Period to create an Operation.');
                return;
            }
            showOrgOperationCreateDialog(sheet, matchingPhase.id, minAge, maxAge, graphData.dobTimestamp);
        });

        opStripEl.addEventListener('pointercancel', () => {
            opDrag = null;
            if (opGhostEl) opGhostEl.setAttribute('display', 'none');
        });
    }

    // ── SVG mousemove: segment hover (insert ghost) + connector lines ─────────
    let lastHoveredConnectorUnitId = null;

    $svg.on('mousemove.orgLifeline', (ev) => {
        if (wrapper.hasClass('map-mode')) return;
        const e = ev.originalEvent || ev;
        const rect = svg.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        // ── Segment hover detection (insert ghost) ────────────────────────────
        if (!drag) {
            const seg = findHoveredSegment(sx, sy, graphData, viewState);
            const changed = JSON.stringify(seg) !== JSON.stringify(viewState.hoveredSegment);
            if (changed) {
                viewState.hoveredSegment = seg;
                svg.style.cursor = seg ? 'pointer' : '';
                requestAnimationFrame(() => render(svg, viewState, graphData));
            }
        }

        let closestUnitId = null;
        let closestNodeEl = null;
        let minDist = 20; // px hit radius

        svg.querySelectorAll('.subway-node[data-unit-id]').forEach(nodeEl => {
            const c = getNodeElementCenter(nodeEl);
            const d = Math.hypot(sx - c.x, sy - c.y);
            if (d < minDist) { minDist = d; closestUnitId = nodeEl.getAttribute('data-unit-id'); closestNodeEl = nodeEl; }
        });

        if (closestUnitId === lastHoveredConnectorUnitId) return; // no change
        lastHoveredConnectorUnitId = closestUnitId;

        if (closestUnitId && context.connectorSvg) {
            const map = getMapInstance(mapActorKey);
            if (map) {
                context.activeConnector = { type: 'node', unitId: closestUnitId };
                drawConnectorFromSvgNode(context.connectorSvg, closestNodeEl, graphData, map);
            }
        } else {
            clearConnectorLines(context.connectorSvg);
            context.activeConnector = null;
        }
    });

    $svg.on('mouseleave.orgLifeline', () => {
        if (lastHoveredConnectorUnitId !== null) {
            lastHoveredConnectorUnitId = null;
            clearConnectorLines(context.connectorSvg);
            context.activeConnector = null;
        }
        if (viewState.hoveredSegment) {
            viewState.hoveredSegment = null;
            svg.style.cursor = '';
            requestAnimationFrame(() => render(svg, viewState, graphData));
        }
    });
}

// ─── Unit map markers (Google Maps layer) ─────────────────────────────────────

const CIRCLE_PATH = 'M -1,0 A 1,1 0 1,1 1,0 A 1,1 0 1,1 -1,0 Z';

function resolveAssetUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return window.location.origin + '/' + path.replace(/^\//, '');
}

/**
 * Returns the engagement node that a map drag should write to.
 *
 * Priority:
 *  1. The last engagement that has no location yet  (time-first flow: pending)
 *  2. The last engagement overall                   (update / location-first)
 *  3. null — no engagements exist, caller must create one
 */
function findTargetEngagement(track) {
    const engNodes = track.nodes.filter(n => n.type === 'level');
    if (!engNodes.length) return null;
    // Walk backwards: prefer the last node missing a location
    for (let i = engNodes.length - 1; i >= 0; i--) {
        const n = engNodes[i];
        if (!Number.isFinite(n.lat) || !Number.isFinite(n.lng)) return n;
    }
    // All have locations — return the last one (allow re-positioning)
    return engNodes[engNodes.length - 1];
}

function refreshUnitMarkers(mapActorKey, graphData, context, sheet, svg, viewState) {
    // Clear previous markers
    context.unitMarkers.forEach(m => m.setMap(null));
    context.unitMarkers = [];

    if (!window.google?.maps) return;
    const map = getMapInstance(mapActorKey);
    if (!map) return;

    const hqLat = parseFloat(sheet.actor.system.structure?.headquartersLat);
    const hqLng = parseFloat(sheet.actor.system.structure?.headquartersLng);
    const hasHQ = (hqLat || hqLng) && Number.isFinite(hqLat) && Number.isFinite(hqLng);

    for (const track of Object.values(graphData.tracks || {})) {
        const allEngNodes    = track.nodes.filter(n => n.type === 'level');
        const locatedEngNodes = allEngNodes.filter(n => Number.isFinite(n.lat) && Number.isFinite(n.lng));
        const lastLocated    = locatedEngNodes[locatedEngNodes.length - 1];
        const lastEng        = allEngNodes[allEngNodes.length - 1];

        // isPending: the most recent engagement has no location
        const isPending = lastEng && (!Number.isFinite(lastEng.lat) || !Number.isFinite(lastEng.lng));

        // Marker position: last known location → HQ → skip
        let pos;
        if (lastLocated) {
            pos = { lat: lastLocated.lat, lng: lastLocated.lng };
        } else if (hasHQ) {
            pos = { lat: hqLat, lng: hqLng };
        } else {
            continue;
        }

        const logoUrl = resolveAssetUrl(track.logo);

        const baseIcon = logoUrl
            ? {
                url:        logoUrl,
                scaledSize: new window.google.maps.Size(36, 36),
                anchor:     new window.google.maps.Point(18, 18),
            }
            : {
                path:        CIRCLE_PATH,
                scale:       8,
                fillColor:   track.color,
                fillOpacity: isPending ? 0.55 : 1,
                strokeWeight: isPending ? 2.5 : 2,
                strokeColor:  isPending ? '#ffd700' : '#fff',
            };

        // ── Main draggable marker ─────────────────────────────────────────────
        const marker = new window.google.maps.Marker({
            position: pos,
            map,
            title:     track.name + (isPending ? ' — drag to set location' : ''),
            icon:      baseIcon,
            draggable: true,
            zIndex:    200,
        });

        // ── Pending ring overlay (logo case only) ─────────────────────────────
        // For logo markers we can't tint the image icon, so add a separate
        // pulsing-yellow circle marker behind/around it.
        if (isPending && logoUrl) {
            const ring = new window.google.maps.Marker({
                position: pos,
                map,
                icon: {
                    path:         CIRCLE_PATH,
                    scale:        22,
                    fillOpacity:  0,
                    strokeWeight: 2.5,
                    strokeColor:  '#ffd700',
                    strokeOpacity: 0.85,
                },
                clickable: false,
                zIndex: 199,
            });
            context.unitMarkers.push(ring);
        }

        // ── Drag-end: place the unit ──────────────────────────────────────────
        marker.addListener('dragend', async (event) => {
            const newLat = event.latLng.lat();
            const newLng = event.latLng.lng();

            // Reverse geocode in the background — show coords immediately
            const locationName = await reverseGeocode(newLat, newLng)
                .catch(() => `${newLat.toFixed(5)}, ${newLng.toFixed(5)}`);

            const targetNode = findTargetEngagement(track);

            if (targetNode) {
                // Update existing engagement's location
                await sheet.actor.update({
                    [`system.phases.${targetNode.phaseId}.operations.${targetNode.opId}.engagements.${targetNode.engId}.spanFromLat`]:      newLat,
                    [`system.phases.${targetNode.phaseId}.operations.${targetNode.opId}.engagements.${targetNode.engId}.spanFromLng`]:      newLng,
                    [`system.phases.${targetNode.phaseId}.operations.${targetNode.opId}.engagements.${targetNode.engId}.spanFromLocation`]: locationName,
                    [`system.phases.${targetNode.phaseId}.operations.${targetNode.opId}.engagements.${targetNode.engId}.name`]:             locationName,
                });
            } else {
                // No engagement yet — location-first flow: create one at now
                const now     = new Date();
                const dateStr = now.toISOString().split('T')[0];
                const timeStr = now.toTimeString().substring(0, 5);
                await saveNewEngagement(sheet, track.id, dateStr, timeStr,
                    { lat: newLat, lng: newLng, name: locationName });
            }
            // Actor update triggers Foundry re-render → markers and SVG rebuilt automatically
        });

        // ── Marker hover → connector line to SVG nodes ────────────────────────
        if (svg && viewState && context.connectorSvg) {
            const markerPos = pos; // captured at render time; refreshed on each re-render
            marker.addListener('mouseover', () => {
                const map = getMapInstance(mapActorKey);
                if (!map) return;
                context.activeConnector = { type: 'marker', unitId: track.id };
                drawConnectorFromMapMarker(
                    context.connectorSvg, track, markerPos.lat, markerPos.lng,
                    svg, viewState, map
                );
            });
            marker.addListener('mouseout', () => {
                clearConnectorLines(context.connectorSvg);
                context.activeConnector = null;
            });
        }

        context.unitMarkers.push(marker);
    }
}

// ─── Mandate chip interactions ────────────────────────────────────────────────

function attachMandateListeners(html, svg, sheet, viewState, graphData) {
    const dragProxy    = html.find('#org-lifeline-drag-proxy')[0];
    const mandateChips = html.find('.graph-goal-hud-container .goal-hud-chip');

    // Hover → show dotted connection lines to linked engagement nodes
    mandateChips.on('mouseenter', (event) => {
        if (viewState.mandateFadeTimeout) {
            clearTimeout(viewState.mandateFadeTimeout);
            viewState.mandateFadeTimeout = null;
        }
        viewState.highlightedMandateId = event.currentTarget.dataset.id;
        viewState.hoveredMandateRect   = event.currentTarget.getBoundingClientRect();
        viewState.isMandateLineFading  = false;
        requestAnimationFrame(() => render(svg, viewState, graphData));
    });

    mandateChips.on('mouseleave', () => {
        viewState.isMandateLineFading = true;
        requestAnimationFrame(() => render(svg, viewState, graphData));
        viewState.mandateFadeTimeout = setTimeout(() => {
            viewState.highlightedMandateId = null;
            viewState.hoveredMandateRect   = null;
            viewState.isMandateLineFading  = false;
            viewState.mandateFadeTimeout   = null;
            requestAnimationFrame(() => render(svg, viewState, graphData));
        }, 3000); // 2 s delay + 1 s CSS fade
    });

    // Right-click → edit mandate
    mandateChips.on('contextmenu', (event) => {
        event.preventDefault();
        const mandateId   = event.currentTarget.dataset.id;
        const mandateData = sheet.actor.system.mandates?.[mandateId];
        if (mandateData) openMandateEditDialog(sheet, mandateId, mandateData, viewState);
    });

    // Drag → link mandate to an engagement node
    mandateChips.on('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const chip       = event.currentTarget;
        const mandateId  = chip.dataset.id;
        const importance = chip.dataset.importance;
        const text       = chip.querySelector('.goal-hud-text').textContent;
        const startX     = event.clientX, startY = event.clientY;
        let hasMoved     = false;

        if (dragProxy) {
            dragProxy.style.display = 'flex';
            dragProxy.textContent   = text;
            dragProxy.setAttribute('data-importance', importance);
            dragProxy.style.left    = `${event.clientX}px`;
            dragProxy.style.top     = `${event.clientY}px`;
        }

        const moveHandler = (mv) => {
            if (!hasMoved && Math.hypot(mv.clientX - startX, mv.clientY - startY) > 5) hasMoved = true;
            if (dragProxy) {
                dragProxy.style.left = `${mv.clientX}px`;
                dragProxy.style.top  = `${mv.clientY}px`;
            }
        };

        const upHandler = async (up) => {
            if (dragProxy) dragProxy.style.display = 'none';
            window.removeEventListener('pointermove', moveHandler);
            window.removeEventListener('pointerup',   upHandler);

            if (!hasMoved) return; // click — handled by contextmenu

            // Hit test: find the nearest engagement node under the cursor
            const svgRect = svg.getBoundingClientRect();
            const mouseX  = up.clientX - svgRect.left;
            const mouseY  = up.clientY - svgRect.top;
            if (mouseX < 0 || mouseX > svgRect.width || mouseY < 0 || mouseY > svgRect.height) return;

            let droppedNode = null, minDist = 15;
            for (const track of Object.values(graphData.tracks || {})) {
                for (const node of track.nodes) {
                    if (node.type === 'origin') continue; // skip the start anchor
                    const nx = node.age  * viewState.scaleX + viewState.x;
                    const ny = node.time * viewState.scaleY + viewState.y;
                    const d  = Math.hypot(mouseX - nx, mouseY - ny);
                    if (d < minDist) { minDist = d; droppedNode = node; }
                }
            }

            if (droppedNode?.engId && droppedNode?.phaseId && droppedNode?.opId) {
                const eng = sheet.actor.system.phases?.[droppedNode.phaseId]
                    ?.operations?.[droppedNode.opId]?.engagements?.[droppedNode.engId];
                if (eng) {
                    const existing = Array.isArray(eng.linkedMandateIds) ? [...eng.linkedMandateIds] : [];
                    if (!existing.includes(mandateId)) {
                        await sheet.actor.update({
                            [`system.phases.${droppedNode.phaseId}.operations.${droppedNode.opId}.engagements.${droppedNode.engId}.linkedMandateIds`]:
                                [...existing, mandateId]
                        });
                        ui.notifications.info('Mandate linked to Engagement.');
                    }
                }
            }
        };

        window.addEventListener('pointermove', moveHandler);
        window.addEventListener('pointerup',   upHandler);
    });
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function initializeOrgOperationalLifeline(html, sheet) {
    const svg = html.find('.org-lifeline-svg')[0];
    if (!svg) return;

    const context = getContext(sheet);
    const { viewState, graphData } = context;

    // 1. Process unit data → tracks
    processData(sheet, graphData);

    // 2. Google Map background.
    //    Initialize the map immediately (mirrors the character sheet approach).
    //    If the section is collapsed, Google Maps creates a zero-size instance;
    //    we trigger a resize event when the section is first opened so tiles load.
    const mapActorKey = 'org-ops-' + sheet.actor.id;

    // Connector SVG is always needed (used by both SVG-node hover and marker hover).
    context.connectorSvg = html.find('.org-lifeline-connector-svg')[0] || null;

    const mapContainer = html.find('.org-lifeline-map-background')[0];
    if (mapContainer) {
        const hqLat = parseFloat(sheet.actor.system.structure?.headquartersLat);
        const hqLng = parseFloat(sheet.actor.system.structure?.headquartersLng);
        // Use || fallback (same as character sheet) so that 0 coordinates also
        // fall back to London — (0,0) is the Gulf of Guinea which looks black
        // with the dark map style and is never a valid HQ location.
        const lat = (hqLat || 51.5072);
        const lng = (hqLng || -0.1276);

        // Await so the map instance is in mapStates before we call triggerMapResize.
        await initializeLifelineMap(mapContainer, lat, lng, mapActorKey);

        // Disable Google Maps' native left-drag — all panning is handled by our
        // right-drag handler so both modes use consistent pointer behaviour.
        const mapInst = getMapInstance(mapActorKey);
        if (mapInst) mapInst.setOptions({ draggable: false });

        // Unit markers — one per unit at its last known engagement position.
        // Rebuilt on every render so logo / position / pending state are current.
        refreshUnitMarkers(mapActorKey, graphData, context, sheet, svg, viewState);

        // Trigger a resize so tiles render at the correct dimensions.
        // Needed when the section was open at render time (map may have been
        // created while the DOM was still painting).
        requestAnimationFrame(() => triggerMapResize(mapActorKey));

        // Also fire on the first toggle-open in case the section was collapsed
        // (the map was created at 0×0 and needs tiles loaded on first reveal).
        const $toggle = html.find(`#toggle-org-map-${sheet.actor.id}`);
        $toggle.one('change.orgMapResize', () => {
            requestAnimationFrame(() => triggerMapResize(mapActorKey));
        });
    }

    // 3. Attach interaction listeners
    attachListeners(svg, sheet, viewState, graphData, context, mapActorKey);
    attachMandateListeners(html, svg, sheet, viewState, graphData);

    // 4. ResizeObserver-driven initial SVG render
    const observer = new ResizeObserver((entries) => {
        if (!svg.isConnected) { observer.disconnect(); return; }
        if (entries[0].contentRect.width <= 0) return;
        if (!viewState.initialized) {
            fitToView(svg, viewState, graphData);
        }
        render(svg, viewState, graphData);
    });
    observer.observe(svg);

    if (svg.getBoundingClientRect().width > 0) {
        if (!viewState.initialized) fitToView(svg, viewState, graphData);
        render(svg, viewState, graphData);
    }
}
