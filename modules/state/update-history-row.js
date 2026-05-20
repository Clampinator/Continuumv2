import { getActorHistory } from './get-actor-history.js';
import { resolveNarrativeOrder } from '../temporal-kernel/resolve-narrative-order.js';
import { solveHistoryPhysics } from '../temporal-kernel/solve-history-physics.js';
import { validateSpanPhysics } from '../temporal-kernel/validate-span-physics.js';
import { adjustSpanOnDepartureEdit } from '../temporal-kernel/adjust-span-departure.js';
import { getLoreContext } from './get-lore-context.js';
import { Translator } from '../temporal-translator/temporal-translator.js';
import { parseObjectiveTime } from '../temporal-translator/coordinate-converter.js';
import { resolveLocationContext } from '../temporal-translator/location-resolver.js';
import { cascadeLocationUpdate } from '../temporal-kernel/cascade-location-update.js';
import { resolveLocation } from './geocode-service.js';

/**
 * STATE: UPDATE HISTORY ROW
 * Updates a record in the database, including physical re-sequencing.
 * ENFORCES: TTL Precision Handshake.
 */
export async function updateHistoryRow(actor, recordId, data) {
    if (!recordId || recordId === 'now') return;

    const history = getActorHistory(actor);
    const lore = getLoreContext(actor);
    
    const oldNode = history.find(n => n.id === recordId);
    if (!oldNode) return;

    // ARRIVAL EDIT: The dialog/caller reconstructs full span data before
    // calling this function. The _editArrivalOnly flag survives to tell
    // the departure-delta rule (below) not to adjust the arrival timestamp.
    // Departure edits move both ends; arrival-only edits move only arrival.

    // 1. Resolve Origin Time (Birth Authority)
    const dob = actor.system.personal?.dob || "1970-01-01";
    const birthCtx = resolveLocationContext([], 0, actor);
    const originTime = parseObjectiveTime(dob, "12:00:00", birthCtx);

    // 2. Facts to Physics Conversion (TTL Handshake)
    let atomic = Translator.toAtomic(data, history, actor);

    // AUTHORITY: Pre-computed timestamps bypass the string round-trip.
    // Same as insert-history-row: callers with exact ms values must not
    // suffer timezone drift through date string formatting/re-parsing.
    const preComputedTs = Number(data.ts) || null;
    const preComputedArrivalTs = Number(data.arrivalTs) || null;

    // POST-SAVE HANDSHAKE (pre-commit): If TTL produced different values
    // than the caller's exact timestamps, log a drift warning.
    if (preComputedTs && Number(atomic.ts) !== preComputedTs) {
        console.warn('[UPDATE-HANDSHAKE] TTL drifted ts:', {
            id: recordId, ttlTs: Number(atomic.ts), preComputedTs, drift: Number(atomic.ts) - preComputedTs
        });
    }
    if (preComputedArrivalTs && Number(atomic.arrivalTs) !== preComputedArrivalTs) {
        console.warn('[UPDATE-HANDSHAKE] TTL drifted arrivalTs:', {
            id: recordId, ttlArrivalTs: Number(atomic.arrivalTs), preComputedArrivalTs, drift: Number(atomic.arrivalTs) - preComputedArrivalTs
        });
    }

    // Apply overrides AFTER drift check so committed values are correct.
    if (preComputedTs) atomic.ts = preComputedTs;
    if (preComputedArrivalTs) atomic.arrivalTs = preComputedArrivalTs;

    // SPAN DEPARTURE EDIT: Kernel enforces span duration conservation.
    // When departure shifts, arrival moves by the same delta. Only
    // arrival-only edits change the span length. The _editArrivalOnly
    // flag prevents this rule from applying to arrival-only edits
    // (editing arrival should NOT move the departure).
    //
    // INTENT GATE: _departureChanged is set by the dialog when the user
    // actually changed the departure date/time. Without this flag, editing
    // a span's title or notes would trigger arrival adjustment from TTL
    // micro-drift, cascading through the compensation wave.
    // TOLERANCE GATE: Even with the intent flag, the delta must exceed
    // MIN_DEPARTURE_DELTA_MS (1 second) to filter out TTL rounding noise.
    const shouldAdjustArrival = data._departureChanged
        && !data._editArrivalOnly
        && oldNode.record?.eventIsSpan
        && oldNode.record?.arrivalTs;

    if (shouldAdjustArrival) {
        const { arrivalTs: correctedArrival, adjusted } = adjustSpanOnDepartureEdit(
            atomic.ts,
            Number(oldNode.record.ts),
            Number(oldNode.record.arrivalTs)
        );
        if (adjusted) {
            atomic = { ...atomic, arrivalTs: correctedArrival };
        }
    }

    const targetNode = { 
        id: recordId, 
        x: atomic.eventAge, 
        y: atomic.ts, 
        arrivalY: atomic.arrivalTs, 
        record: atomic 
    };

    // 3. Physical Validation
    // skipLevelBreath: the event already passed the consecutive-span check at
    // insertion time. Re-checking against the globally-last node gives false
    // positives when editing a span that sits in the middle of the history.
    const validation = validateSpanPhysics(targetNode, lore, { skipLevelBreath: true, history, recordId });
    if (!validation.isValid) {
        ui.notifications.error(validation.error);
        return;
    }

    // 4. Narrative Re-sequencing
    const { sort, shifts: narrativeShifts } = resolveNarrativeOrder(history, targetNode);
    
    // 5. Compensation Wave (Propagate physical changes)
    const virtualHistory = history.map(n => n.id === recordId ? { ...targetNode, sort } : n);
    const physicsShifts = solveHistoryPhysics(virtualHistory, originTime);

    // 6. Database Commit
    const updates = {};
    const finalRecord = { 
        ...atomic, 
        id: recordId,
        sort, 
        eventAge: physicsShifts[recordId] !== undefined ? physicsShifts[recordId] : atomic.eventAge, 
        ts: atomic.ts, 
        arrivalTs: atomic.arrivalTs,
        // LOCATION INHERITANCE: Pass through from caller. If the caller
        // (dialog or spreadsheet) determined these flags, keep them.
        // If not provided, preserve the old record's flags.
        locationInherited: data.locationInherited !== undefined
            ? data.locationInherited !== false
            : (oldNode.record?.locationInherited !== false),
        spanFromLocationInherited: data.spanFromLocationInherited !== undefined
            ? data.spanFromLocationInherited !== false
            : (oldNode.record?.spanFromLocationInherited !== false),
        spanToLocationInherited: data.spanToLocationInherited !== undefined
            ? data.spanToLocationInherited !== false
            : (oldNode.record?.spanToLocationInherited !== false),
        // PULLED SPAN: Pass through from dialog data. Only meaningful when
        // eventIsSpan is true. If not provided, preserve the old record's value.
        isPulled: data.isPulled !== undefined
            ? Boolean(data.isPulled)
            : Boolean(oldNode.record?.isPulled)
    };

    // DIAGNOSTIC: Verify location fields survive the full data pipeline.
    console.debug(
        `[UPDATE-HISTORY-ROW] finalRecord location fields:`,
        `lat=${finalRecord.lat} lng=${finalRecord.lng} zoom=${finalRecord.zoom}`,
        finalRecord.eventIsSpan
            ? `spanFrom: lat=${finalRecord.eventSpanFromLat} lng=${finalRecord.eventSpanFromLng} | spanTo: lat=${finalRecord.eventSpanToLat} lng=${finalRecord.eventSpanToLng}`
            : '(level event)'
    );

    // Geocode Resolution: Fill missing lat/lng from location text.
    // Same enrichment as insert-history-row - resolves coordinates for any
    // location slot that has text but no coordinates.
    await _enrichCoordinates(finalRecord);

    const oldPath = oldNode.path;
    const newEraId = data.eraId || oldNode.record.eraId;
    const newExpId = data.expId || oldNode.record.expId;
    
    // Manual path resolution for updates
    const newRoot = newExpId && newExpId !== 'null'
        ? `system.eras.${newEraId}.experiences.${newExpId}`
        : `system.eras.${newEraId}`;
    const newPath = `${newRoot}.events.${recordId}`;

    if (newPath !== oldPath) {
        const oldParentPath = oldPath.substring(0, oldPath.lastIndexOf('.'));
        updates[`${oldParentPath}.-=${recordId}`] = null;
        updates[newPath] = finalRecord;
    } else {
        updates[oldPath] = finalRecord;
    }

    for (const shift of narrativeShifts) {
        updates[`${shift.path}.sort`] = shift.sort;
    }
    for (const [id, newAge] of Object.entries(physicsShifts)) {
        if (id === recordId) continue;
        const node = history.find(n => n.id === id);
        if (node && node.path) updates[`${node.path}.eventAge`] = newAge;
    }

    await actor.update(updates);

    // 7. Location Cascade (propagate location changes to inherited downstream events)
    // Detect if any location field changed compared to the old record and whether
    // the change was manual (locationInherited -> false).
    //
    // Geocoded coordinates (from _enrichCoordinates above) are included in
    // finalRecord, so cascaded downstream events inherit the resolved lat/lng.
    //
    // SEMANTIC BRIDGE: A level location change represents "where you are now".
    // Downstream spans should inherit the new location for BOTH From and To.
    // So a level change triggers all three cascades with the same values.
    if (!data._skipLocationCascade) {
        const oldRec = oldNode.record || {};
        const levelChanged = finalRecord.eventLocation !== (oldRec.eventLocation || '')
            && finalRecord.locationInherited === false;
        const spanFromChanged = finalRecord.eventSpanFromLocation !== (oldRec.eventSpanFromLocation || oldRec.eventLocation || '')
            && finalRecord.spanFromLocationInherited === false;
        const spanToChanged = finalRecord.eventSpanToLocation !== (oldRec.eventSpanToLocation || '')
            && finalRecord.spanToLocationInherited === false;

        const anyLocationChanged = levelChanged || spanFromChanged || spanToChanged;

        if (anyLocationChanged) {
            const postUpdateHistory = getActorHistory(actor);
            const levelVals = levelChanged
                ? { eventLocation: finalRecord.eventLocation, lat: finalRecord.lat ?? null, lng: finalRecord.lng ?? null, zoom: finalRecord.zoom ?? null }
                : null;
            // Level change drives all three cascades.
            // Span-specific change drives only that span cascade.
            const spanFromVals = levelChanged
                ? { eventLocation: finalRecord.eventLocation, lat: finalRecord.lat ?? null, lng: finalRecord.lng ?? null, zoom: finalRecord.zoom ?? null }
                : spanFromChanged
                    ? { eventLocation: finalRecord.eventSpanFromLocation, lat: finalRecord.eventSpanFromLat ?? null, lng: finalRecord.eventSpanFromLng ?? null, zoom: finalRecord.eventSpanFromZoom ?? null }
                    : null;
            const spanToVals = levelChanged
                ? { eventLocation: finalRecord.eventLocation, lat: finalRecord.lat ?? null, lng: finalRecord.lng ?? null, zoom: finalRecord.zoom ?? null }
                : spanToChanged
                    ? { eventLocation: finalRecord.eventSpanToLocation, lat: finalRecord.eventSpanToLat ?? null, lng: finalRecord.eventSpanToLng ?? null, zoom: finalRecord.eventSpanToZoom ?? null }
                    : null;

            const cascadeUpdates = cascadeLocationUpdate(
                postUpdateHistory, recordId,
                levelVals, spanFromVals, spanToVals
            );

            if (cascadeUpdates.length > 0) {
                const cascadeDbUpdates = {};
                for (const cu of cascadeUpdates) {
                    for (const [field, value] of Object.entries(cu.fields)) {
                        cascadeDbUpdates[`${cu.path}.${field}`] = value;
                    }
                }
                await actor.update(cascadeDbUpdates);
            }
        }
    }

    return { id: recordId, committedTs: atomic.ts, committedArrivalTs: atomic.arrivalTs, committedAge: atomic.eventAge };
}

/*
Enriches a record's missing lat/lng coordinates by geocoding the
location text. Mutates the record in place. Resolution order:
Location actors -> cache -> Nominatim API.

Only geocodes when location text is present but coordinates are null.
*/
async function _enrichCoordinates(record) {
    // Level event location
    if (record.eventLocation?.trim() && (record.lat == null || record.lng == null)) {
        const geo = await resolveLocation(record.eventLocation.trim());
        if (geo) {
            record.lat = geo.lat;
            record.lng = geo.lng;
            record.zoom = geo.zoom;
        }
    }

    if (!record.eventIsSpan) return;

    // Span departure location
    if (record.eventSpanFromLocation?.trim() &&
        (record.eventSpanFromLat == null || record.eventSpanFromLng == null)) {
        const geo = await resolveLocation(record.eventSpanFromLocation.trim());
        if (geo) {
            record.eventSpanFromLat = geo.lat;
            record.eventSpanFromLng = geo.lng;
            record.eventSpanFromZoom = geo.zoom;
        }
    }

    // Span arrival location
    if (record.eventSpanToLocation?.trim() &&
        (record.eventSpanToLat == null || record.eventSpanToLng == null)) {
        const geo = await resolveLocation(record.eventSpanToLocation.trim());
        if (geo) {
            record.eventSpanToLat = geo.lat;
            record.eventSpanToLng = geo.lng;
            record.eventSpanToZoom = geo.zoom;
        }
    }
}
