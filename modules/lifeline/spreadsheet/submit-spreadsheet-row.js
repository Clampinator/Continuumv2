import { handleSubmit } from '../services/ui/event-dialog/handle-submit.js';
import { ReferenceResolver } from '../services/reference-resolver.js';
import { normalizeDateInput, parseDate } from '../../span-graph-utils/provide-span-graph-utils.js';
import { processGraphData } from '../../span-graph-data-processor.js';
import { renderGraph } from '../../span-graph-render.js';
import { getSheetContext } from '../../span-graph-state.js';
import { Sound } from '../../sound-manager.js';

function _parseTs(dateStr, timeStr) {
    const d = normalizeDateInput(dateStr);
    if (!d) return null;
    const dt = parseDate(`${d}T${timeStr || '12:00:00'}`);
    return dt ? dt.getTime() : null;
}

/**
 * Finds the insertion point on the timeline that corresponds to the given timestamp.
 * Returns { age, time } that matches the position on the graph where this date
 * would appear, accounting for all rail offsets caused by spans.
 * 
 * This matches exactly how manual timeline insertion gets worldAge/worldTime from
 * the hovered segment position.
 * 
 * @param {object} graphData - The current graph state with levelNodes
 * @param {number} ts - The timestamp of the insertion point
 * @param {number} dobTs - The DOB timestamp (global rail origin)
 * @returns {object} { age, time } - The correct insertion coordinates
 */
function _getSpreadsheetInsertionPoint(graphData, ts, dobTs) {
    const levelNodes = graphData?.levelNodes || [];
    if (levelNodes.length === 0) {
        // No existing nodes, use DOB-based calculation
        return { age: Math.max(0, (ts - dobTs) / 1000), time: ts };
    }
    
    // Find the segment (pair of consecutive nodes) that contains our timestamp.
    // This EXACTLY matches how process-hover-state.js interpolates worldAge/worldTime.
    for (let i = 0; i < levelNodes.length - 1; i++) {
        const p1 = levelNodes[i];
        const p2 = levelNodes[i + 1];
        
        // Skip vertical span segments (where age doesn't change but time does)
        if (p1.outgoingType === 'span') continue;
        
        const t1 = p1.time;
        const t2 = p2.time;
        
        // Check if our timestamp falls on this segment
        if (ts >= t1 && ts <= t2) {
            // Interpolate position on this segment (EXACTLY like process-hover-state.js)
            const t = (ts - t1) / (t2 - t1);
            const worldAge = p1.age + t * (p2.age - p1.age);
            const worldTime = p1.time + t * (p2.time - p1.time);
            return { age: worldAge, time: worldTime };
        }
    }
    
    // Timestamp is after all nodes - extrapolate age on the last rail segment.
    // Rail formula: age = (time - railOffset) / 1000, where railOffset = lastNode.time - lastNode.age * 1000.
    // Returning lastNode's age here caused every new event on an empty timeline to land at age=0 (birth).
    const lastNode = levelNodes[levelNodes.length - 1];
    const railOffset = lastNode.time - (lastNode.age * 1000);
    return { age: Math.max(0, (ts - railOffset) / 1000), time: ts };
}

function _refreshGraph(sheet, viewState, graphData) {
    processGraphData(sheet, graphData);
    const svg = sheet.element?.find?.('.span-graph-svg')[0];
    if (svg) renderGraph(svg, viewState, graphData);
}

/**
 * Pins a location to the SpaceTime map by geocoding the address
 * and updating the event's lat/lng/zoom coordinates.
 * Task 5: This is what links spreadsheet location data to the SpaceTime map.
 */
export async function pinLocationToMap(sheet, locationName, rowData) {
    const actor = sheet.actor;
    if (!locationName) return;

    // Try to resolve via SpaceTime's geocoding first (panToLocation uses geocodeAddress)
    const { geocodeAddress } = await import('../../map-manager.js');
    const geoResult = await geocodeAddress(locationName);

    if (!geoResult) {
        ui.notifications.warn(`Could not resolve location "${locationName}". Check the address.`);
        return;
    }

    const lat = geoResult.lat;
    const lng = geoResult.lng;
    const zoom = geoResult.zoom || 12;

    // If this is a new row form (no rowData), just pan the map to show the location
    if (!rowData) {
        const { panToCoordinates } = await import('../../map-manager.js');
        panToCoordinates(lat, lng, zoom);
        ui.notifications.info(`Pinned "${locationName}" to map at (${lat}, ${lng})`);
        return;
    }

    // Update the event's location coordinates on the actor
    const { eraId, expId, eventId } = rowData;
    const root = (expId && expId !== 'null')
        ? `system.eras.${eraId}.experiences.${expId}`
        : `system.eras.${eraId}`;

    const updates = {
        [`${root}.events.${eventId}.location`]: locationName,
        [`${root}.events.${eventId}.lat`]: lat,
        [`${root}.events.${eventId}.lng`]: lng,
        [`${root}.events.${eventId}.zoom`]: zoom,
    };

    await actor.update(updates);
    ui.notifications.info(`Pinned "${locationName}" to event at (${lat}, ${lng})`);
}

/*
Updates the date range of an Experience based on its events.
When events are edited, recalculate the Experience's start/end dates.
*/
async function _updateExperienceDates(actor, eraId, expId) {
    if (!expId || expId === 'null') return;
    const era = actor.system.eras?.[eraId];
    if (!era) return;
    const exp = era.experiences?.[expId];
    if (!exp) return;

    const events = exp.events || {};
    const eventDates = [];

    for (const evt of Object.values(events)) {
        if (evt.isSpan) {
            if (evt.spanFromDate) eventDates.push(evt.spanFromDate);
            if (evt.spanToDate) eventDates.push(evt.spanToDate);
        } else {
            if (evt.date) eventDates.push(evt.date);
        }
    }

    if (eventDates.length === 0) return;

    eventDates.sort();
    const dateFrom = eventDates[0];
    const dateTo = eventDates[eventDates.length - 1];

    const expUpdates = {
        [`system.eras.${eraId}.experiences.${expId}.dateFrom`]: dateFrom,
        [`system.eras.${eraId}.experiences.${expId}.dateTo`]: exp.isOngoing ? "" : dateTo,
    };

    await actor.update(expUpdates);
}

/*
Direct field edit for title, notes, location - no coordinate recalculation needed.
*/
export async function submitSimpleFieldEdit(actor, eraId, expId, eventId, fieldUpdates) {
    const root = (expId && expId !== 'null')
        ? `system.eras.${eraId}.experiences.${expId}`
        : `system.eras.${eraId}`;
    const prefixed = {};
    for (const [field, value] of Object.entries(fieldUpdates)) {
        prefixed[`${root}.events.${eventId}.${field}`] = value;
    }
    await actor.update(prefixed);
}

/*
Resolves location coordinates from a location name by looking up the Location actor.
*/
function _resolveLocationCoords(locationName) {
    if (!locationName) return { lat: null, lng: null, zoom: null };
    const locationActor = game.actors?.find(a =>
        a.type === 'location' &&
        a.name.toLowerCase() === locationName.toLowerCase()
    );
    if (!locationActor) return { lat: null, lng: null, zoom: null };
    const lat = locationActor.system?.map?.lat ?? locationActor.getFlag('continuum-v2', 'latitude') ?? null;
    const lng = locationActor.system?.map?.lng ?? locationActor.getFlag('continuum-v2', 'longitude') ?? null;
    const zoom = locationActor.getFlag('continuum-v2', 'zoom') ?? null;
    return { lat, lng, zoom };
}

/*
Resolves coordinates for a location name. Tries Location actor lookup first,
then falls back to Nominatim geocoding. Returns { lat, lng, zoom } or nulls.
*/
async function _geocodeLocation(locationName) {
    if (!locationName) return { lat: null, lng: null, zoom: null };
    const fromActor = _resolveLocationCoords(locationName);
    if (fromActor.lat !== null) return fromActor;
    const { geocodeAddress } = await import('../../map-manager.js');
    const result = await geocodeAddress(locationName);
    return result ? { lat: result.lat, lng: result.lng, zoom: result.zoom || 12 } : { lat: null, lng: null, zoom: null };
}

/*
Creates a new event on the lifeline from spreadsheet row form values.
formValues: { title, notes, location, date, time, isSpan, isRest,
              spanFromDate, spanFromTime, spanFromLocation,
              spanToDate, spanToTime, spanToLocation,
              experienceAction, startNewExp, newExpName,
              closeExperiences, reopenExperiences }
Task 1: Uses 'insert' mode when inserting into an existing timeline to trigger
        the reconciliation span logic in createInsertedSpan.
Task 5: Resolves location coordinates from Location actors for SpaceTime map linking.
*/
export async function submitNewRow(sheet, formValues, { batchImport = false, lastSpanToTs = null, skipGeocode = false } = {}) {
    const actor = sheet.actor;
    const { viewState, graphData } = getSheetContext(sheet);
    const isSpan = !!formValues.isSpan;

    // CRITICAL: Refresh graph data before calculating coordinates to ensure
    // we have the latest timeline state including any recent span insertions.
    // This matches how manual insertion gets fresh data from the graph.
    processGraphData(sheet, graphData);

    const primaryDate = normalizeDateInput(isSpan ? formValues.spanFromDate : formValues.date);
    const primaryTime = (isSpan ? formValues.spanFromTime : formValues.time) || '12:00:00';

    if (!primaryDate || !formValues.title?.trim()) return false;
    const ts = _parseTs(primaryDate, primaryTime);
    if (!ts) return false;

    const dobTs = ReferenceResolver.resolveOrigin(actor);

    // For events whose objective date precedes the character's DOB, the normal
    // date-based age calculation gives a negative number clamped to zero, piling
    // every such event at the birth position. Instead, place them at the current
    // NOW position so they land sequentially in CSV order. The user can drag them
    // to their correct subjective positions afterward.
    const isPredob = !!dobTs && ts < dobTs;
    const insertionPoint = _getSpreadsheetInsertionPoint(graphData, ts, dobTs);
    const nowAge = graphData.nowNode?.age ?? 0;
    let batchAge;
    if (batchImport && isSpan && lastSpanToTs !== null) {
        // Advance by the time the character lived at the previous span's arrival point.
        // This makes the connecting level line between consecutive spans exactly 30 degrees
        // (deltaTime / deltaAge = 1000, the physical law for level travel).
        const lived = (ts - lastSpanToTs) / 1000;
        batchAge = lived > 1 ? nowAge + lived : nowAge + 1;
    } else {
        // Use rail-projected age so level events after time-travel spans land at
        // their correct calendar-date positions on the current post-span rail.
        // dobAge uses only the global DOB rail and ignores span offsets, causing
        // level events after spans to pile up at nowAge+1 instead of their true positions.
        const railAge = _getSpreadsheetInsertionPoint(graphData, ts, dobTs).age;
        batchAge = railAge > nowAge ? railAge : nowAge + 1;
    }
    const ageRaw = batchImport ? batchAge
                 : (isPredob ? nowAge : insertionPoint.age);

    // Resolve coordinates: use pre-supplied coords when available (rebuild path),
    // otherwise look up Location actor then fall back to Nominatim geocoding.
    const _coords = (loc, preLat, preLng, preZoom) => {
        if (preLat != null) return Promise.resolve({ lat: preLat, lng: preLng, zoom: preZoom || 12 });
        return skipGeocode ? Promise.resolve({ lat: null, lng: null, zoom: null }) : _geocodeLocation(loc);
    };
    const [locCoords, spanFromCoords, spanToCoords] = await Promise.all([
        _coords(formValues.location, formValues.lat, formValues.lng, formValues.zoom),
        _coords(formValues.spanFromLocation, formValues.spanFromLat, formValues.spanFromLng, formValues.spanFromZoom),
        _coords(formValues.spanToLocation, formValues.spanToLat, formValues.spanToLng, formValues.spanToZoom),
    ]);

    const fd = {
        title: formValues.title.trim(),
        notes: formValues.notes || '',
        isSpan,
        isRest: !!formValues.isRest,
        eventDate: primaryDate,
        eventTime: primaryTime,
        eventAge: '',
        eventLocation: formValues.location || '',
        eventLat: locCoords.lat, eventLng: locCoords.lng, eventZoom: locCoords.zoom,
        experienceAction: formValues.experienceAction || '',
        startNewExp: !!formValues.startNewExp,
        newExpName: formValues.newExpName || '',
        closeExperiences: formValues.closeExperiences || '',
        reopenExperiences: formValues.reopenExperiences || '',
        spanFromDate: normalizeDateInput(formValues.spanFromDate) || primaryDate,
        spanFromTime: formValues.spanFromTime || primaryTime,
        spanFromLocation: formValues.spanFromLocation || '',
        spanFromLat: spanFromCoords.lat, spanFromLng: spanFromCoords.lng, spanFromZoom: spanFromCoords.zoom,
        spanToDate: normalizeDateInput(formValues.spanToDate) || primaryDate,
        spanToTime: formValues.spanToTime || primaryTime,
        spanToLocation: formValues.spanToLocation || '',
        spanToLat: spanToCoords.lat, spanToLng: spanToCoords.lng, spanToZoom: spanToCoords.zoom,
    };

    // Use 'insert' mode only when the actor already has events AND the new event falls
    // before the current NOW cursor. This triggers reconciliation span logic in
    // createInsertedSpan. All other cases use 'log' to avoid capping the new event
    // to a stale or zero NOW cursor.
    // NOTE: check for actual events, not just ages - an actor with ages but no events
    // has effectiveNowAge=0, which would cap every inserted event to birth.
    const nowTime = graphData.nowNode?.time ?? dobTs ?? 0;
    const hasExistingEvents = Object.values(actor.system.eras || {}).some(era =>
        Object.keys(era.events || {}).length > 0 ||
        Object.values(era.experiences || {}).some(exp => Object.keys(exp.events || {}).length > 0)
    );
    // Pre-DOB events are forced to log mode - insert mode would trigger span
    // reconciliation against a NOW cursor that is meaningless for time-travel events.
    // Batch import always logs forward - never insert, which would trigger reconciliation
    // and could place nodes out of CSV sequence.
    const mode = (batchImport || !hasExistingEvents || isPredob || ts >= nowTime) ? 'log' : 'insert';

    const params = {
        mode,
        ageRaw, timeRaw: ts,
        eraId: formValues.eraId || null,
        expId: formValues.expId || null,
        viewState, graphData,
        dragStartWorld: { time: ts, age: ageRaw, eraId: null, expId: null, lat: locCoords.lat, lng: locCoords.lng }
    };

    viewState.isCommittingLog = true;
    try {
        await handleSubmit(actor, fd, params);
    } finally {
        viewState.isCommittingLog = false;
    }

    _refreshGraph(sheet, viewState, graphData);
    Sound.confirm();
    return true;
}

/*
Saves changes from the expanded row section (span fields, experience options).
existingData: the row object from getSpreadsheetRows.
formValues: fields that changed.
Task 2: Updates associated Experience date ranges after saving.
Task 5: Preserves and resolves location coordinates for SpaceTime map linking.
*/
export async function submitExpandedEdit(sheet, existingData, formValues) {
    const actor = sheet.actor;
    const { viewState, graphData } = getSheetContext(sheet);
    const isSpan = !!formValues.isSpan;

    const primaryDate = normalizeDateInput(isSpan ? formValues.spanFromDate : formValues.date) || existingData.date;
    const primaryTime = (isSpan ? formValues.spanFromTime : formValues.time) || existingData.time || '12:00:00';
    const ts = _parseTs(primaryDate, primaryTime);
    const dobTs = ReferenceResolver.resolveOrigin(actor);
    // Preserve the stored subjective age rather than recalculating from the date.
    // Recalculating via (ts - dobTs) snaps time-travel events back to their DOB-rail
    // position, discarding the subjective placement set during import or manual editing.
    const ageRaw = existingData.age || (ts && dobTs ? Math.max(0, (ts - dobTs) / 1000) : 0);
    const toTs = isSpan ? (_parseTs(normalizeDateInput(formValues.spanToDate), formValues.spanToTime) || ts) : ts;

    // Resolve coordinates: Location actor lookup first, then Nominatim geocoding.
    const [locCoords, spanFromCoords, spanToCoords] = await Promise.all([
        _geocodeLocation(formValues.location),
        _geocodeLocation(formValues.spanFromLocation),
        _geocodeLocation(formValues.spanToLocation),
    ]);

    const fd = {
        title: formValues.title ?? existingData.title ?? '',
        notes: formValues.notes ?? existingData.notes ?? '',
        isSpan,
        isRest: formValues.isRest ?? existingData.isRest ?? false,
        eventDate: primaryDate || '',
        eventTime: primaryTime,
        eventAge: '',
        eventLocation: formValues.location ?? existingData.location ?? '',
        eventLat: locCoords.lat ?? existingData.lat ?? null,
        eventLng: locCoords.lng ?? existingData.lng ?? null,
        eventZoom: locCoords.zoom ?? existingData.zoom ?? null,
        experienceAction: formValues.experienceAction || '',
        startNewExp: !!formValues.startNewExp,
        newExpName: formValues.newExpName || '',
        closeExperiences: formValues.closeExperiences || '',
        reopenExperiences: formValues.reopenExperiences || '',
        spanFromDate: normalizeDateInput(formValues.spanFromDate || existingData.spanFromDate) || '',
        spanFromTime: formValues.spanFromTime || existingData.spanFromTime || '',
        spanFromLocation: formValues.spanFromLocation ?? existingData.spanFromLocation ?? '',
        spanFromLat: spanFromCoords.lat ?? existingData.spanFromLat ?? null,
        spanFromLng: spanFromCoords.lng ?? existingData.spanFromLng ?? null,
        spanFromZoom: spanFromCoords.zoom ?? existingData.spanFromZoom ?? null,
        spanToDate: normalizeDateInput(formValues.spanToDate || existingData.spanToDate) || '',
        spanToTime: formValues.spanToTime || existingData.spanToTime || '',
        spanToLocation: formValues.spanToLocation ?? existingData.spanToLocation ?? '',
        spanToLat: spanToCoords.lat ?? existingData.spanToLat ?? null,
        spanToLng: spanToCoords.lng ?? existingData.spanToLng ?? null,
        spanToZoom: spanToCoords.zoom ?? existingData.spanToZoom ?? null,
    };

    const params = {
        mode: 'edit',
        existingData: { ...existingData, isSpan },
        ageRaw, timeRaw: toTs || ts || 0,
        eraId: existingData.eraId,
        expId: existingData.expId || null,
        viewState, graphData,
    };

    viewState.isCommittingLog = true;
    try {
        await handleSubmit(actor, fd, params);
    } finally {
        viewState.isCommittingLog = false;
    }

    // Task 2: Update associated Experience date ranges after saving
    const targetExpId = formValues.experienceAction
        ? formValues.experienceAction.split(':')[2]
        : (existingData.expId || null);
    if (targetExpId && targetExpId !== 'null') {
        await _updateExperienceDates(actor, existingData.eraId, targetExpId);
    }

    _refreshGraph(sheet, viewState, graphData);
    Sound.confirm();
}
