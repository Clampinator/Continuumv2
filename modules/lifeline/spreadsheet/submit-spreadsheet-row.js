import { findEventPath } from './data-utils.js';
import { pushSnapshot } from '../undo-manager.js';
import { insertHistoryRow } from '../../state/insert-history-row.js';
import { updateHistoryRow } from '../../state/update-history-row.js';
import { resolveEventEra } from '../../temporal-kernel/resolve-event-era.js';
import { parseObjectiveTime } from '../../temporal-translator/coordinate-converter.js';
import { resolveLocationContext } from '../../temporal-translator/location-resolver.js';
import { resolveDefaultLocation } from '../../temporal-kernel/resolve-default-location.js';
import { cascadeLocationUpdate } from '../../temporal-kernel/cascade-location-update.js';
import { getActorHistory } from '../../state/get-actor-history.js';

/**
 * Processes a single field update on an existing event row.
 * For location fields, detects manual changes and triggers cascade.
 * @param {Actor} actor - The actor being updated.
 * @param {string} eventId - The ID of the event.
 * @param {string} field - The field being changed.
 * @param {any} value - The new value.
 */
export async function submitSpreadsheetRow(actor, eventId, field, value) {
    const path = findEventPath(actor, eventId);

    if (!path) {
        console.warn(`[LSS] Could not find event ${eventId} in actor data.`);
        return;
    }

    pushSnapshot(actor);

    // LOCATION CASCADE: When a location field is changed directly in the
    // spreadsheet, this is a manual edit. We need to route through
    // updateHistoryRow so it can set the inheritance flag and cascade
    // to downstream events. A raw path write bypasses all of that.
    const locationFields = ['eventLocation', 'eventSpanFromLocation', 'eventSpanToLocation'];
    if (locationFields.includes(field)) {
        // Build a minimal data object with the location change so updateHistoryRow
        // can detect it, set the inheritance flag, and cascade.
        // We need to read the current record to preserve other fields.
        const history = getActorHistory(actor);
        const node = history.find(n => n.id === eventId);
        if (!node) return;
        const rec = node.record || {};

        const updateData = {
            eventTitle: rec.eventTitle || '',
            eventNotes: rec.eventNotes || '',
            eventIsSpan: Boolean(rec.eventIsSpan),
            eventIsRest: Boolean(rec.eventIsRest),
            eventAge: rec.eventAge || 0,
            eventDate: rec.eventDate || '',
            eventTime: rec.eventTime || '12:00:00',
            eventLocation: rec.eventLocation || '',
            eventSpanFromDate: rec.eventSpanFromDate || '',
            eventSpanFromTime: rec.eventSpanFromTime || '12:00:00',
            eventSpanFromLocation: rec.eventSpanFromLocation || '',
            eventSpanToDate: rec.eventSpanToDate || '',
            eventSpanToTime: rec.eventSpanToTime || '12:00:00',
            eventSpanToLocation: rec.eventSpanToLocation || '',
            eraId: node.eraId,
            expId: node.expId
        };

        // Apply the field change
        updateData[field] = value;

        // Set the corresponding inheritance flag to false (manual edit)
        if (field === 'eventLocation') updateData.locationInherited = false;
        if (field === 'eventSpanFromLocation') updateData.spanFromLocationInherited = false;
        if (field === 'eventSpanToLocation') updateData.spanToLocationInherited = false;

        return await updateHistoryRow(actor, eventId, updateData);
    }

    const targetPath = `${path}.${field}`;

    return await actor.update({ [targetPath]: value });
}

/**
 * Inserts a new event row from spreadsheet/CSV form values.
 * Bridges form data to the state layer via insertHistoryRow.
 *
 * @param {ActorSheet} sheet - The Foundry actor sheet.
 * @param {Object} fv - Form values from spreadsheet or CSV import.
 * @param {Object} [options] - Options: { batchImport, lastSpanToTs, skipGeocode }
 * @returns {string|null} The new event ID, or null on failure.
 */
export async function submitNewRow(sheet, fv, options = {}) {
    const actor = sheet.actor;

    // Determine span status from the explicit flag or span-specific facts.
    // Only treat as span if: (a) the flag is set, OR (b) span has both a From and To
    // that differ from each other AND from the level date. A level event that merely
    // has an arrival timestamp equal to its departure should NOT become a span.
    const eventIsSpan = Boolean(fv.eventIsSpan);

    // For imported spans where only To dates are provided, the From dates come from
    // the level fields (date/time). Transfer those to the span fields.
    if (eventIsSpan && !fv.eventSpanFromDate && fv.date) {
        fv.eventSpanFromDate = fv.date;
    }
    if (eventIsSpan && !fv.eventSpanFromTime && fv.time) {
        fv.eventSpanFromTime = fv.time;
    }
    if (eventIsSpan && !fv.eventSpanFromLocation && fv.location) {
        fv.eventSpanFromLocation = fv.location;
    }

    // Resolve era/experience
    const eras = actor.system.eras || {};
    const eraId = resolveEventEra(eras, 0) || Object.keys(eras)[0] || 'era0';

    // Handle experience assignment
    let expId = null;
    if (fv.experienceAction && fv.experienceAction.startsWith('move:')) {
        const parts = fv.experienceAction.split(':');
        expId = parts[2] || null;
    }
    let startsExpId = null;
    if (fv.startNewExp && fv.newExpName) {
        // Create a new experience in the target era
        const newExpId = foundry.utils.randomID();
        const targetEraId = eraId;
        const expPath = `system.eras.${targetEraId}.experiences.${newExpId}`;
        await actor.update({
            [`${expPath}.name`]: fv.newExpName,
            [`${expPath}.dateFrom`]: fv.date || fv.eventSpanFromDate || '',
            [`${expPath}.isOngoing`]: true,
            [`${expPath}.sort`]: Date.now()
        });
        startsExpId = newExpId;
        expId = newExpId;
    }

    // Handle closing experiences
    if (fv.closeExperiences) {
        const parts = fv.closeExperiences.split(':');
        if (parts.length === 2) {
            const [closeEraId, closeExpId] = parts;
            await actor.update({
                [`system.eras.${closeEraId}.experiences.${closeExpId}.dateTo`]: fv.date || fv.eventSpanFromDate || '',
                [`system.eras.${closeEraId}.experiences.${closeExpId}.isOngoing`]: false
            });
        }
    }

    // AUTHORITY: Derive eventAge from date fields when subjectiveAge is absent.
    // Without this, events default to age 0 (birth), causing wrong rail placement.
    const dob = actor.system.personal?.dob || '1970-01-01';
    const birthCtx = resolveLocationContext([], 0, actor);
    const birthTs = parseObjectiveTime(dob, '12:00:00', birthCtx);

    // Resolve the departure timestamp from form values
    const depDate = eventIsSpan ? (fv.eventSpanFromDate || fv.date) : fv.date;
    const depTime = eventIsSpan ? (fv.eventSpanFromTime || fv.time || '12:00:00') : (fv.time || '12:00:00');

    let eventAge = fv.subjectiveAge || 0;
    if (!eventAge && depDate) {
        // Compute age from date-of-birth and departure timestamp
        const depTs = parseObjectiveTime(depDate, depTime, birthCtx);
        if (depTs && birthTs) {
            eventAge = Math.max(0, Math.round((depTs - birthTs) / 1000));
        }
    }

    // Build data payload matching the structure expected by insertHistoryRow
    // LOCATION AUTO-FILL: If no location was provided, resolve the default
    // from the most recent event in history.
    const historyForLoc = getActorHistory(actor);
    const defaultLoc = resolveDefaultLocation(historyForLoc, eventAge, actor);

    const eventLocation = fv.location || '';
    const spanFromLocation = fv.eventSpanFromLocation || '';
    const spanToLocation = fv.eventSpanToLocation || '';

    // INHERITANCE FLAGS: true if the location matches the default (auto-filled)
    // or is empty (no override). false if the user explicitly set a different value.
    const locInherited = eventLocation === '' || eventLocation === defaultLoc.location;
    const spanFromInherited = spanFromLocation === '' || spanFromLocation === defaultLoc.location;
    const spanToInherited = spanToLocation === '' || spanToLocation === defaultLoc.location;

    const data = {
        eventTitle: fv.eventTitle || (eventIsSpan ? 'New Span' : 'New Event'),
        eventNotes: fv.eventNotes || '',
        eventIsSpan: eventIsSpan,
        eventIsRest: Boolean(fv.eventIsRest),

        eventAge,

        eventDate: fv.date || fv.eventSpanFromDate || '',
        eventTime: fv.time || '12:00:00',
        eventLocation: eventLocation || defaultLoc.location,
        lat: fv.lat ?? (eventLocation ? null : defaultLoc.lat),
        lng: fv.lng ?? (eventLocation ? null : defaultLoc.lng),
        zoom: fv.zoom ?? (eventLocation ? null : defaultLoc.zoom),

        eventSpanFromDate: fv.eventSpanFromDate || '',
        eventSpanFromTime: fv.eventSpanFromTime || '12:00:00',
        eventSpanFromLocation: spanFromLocation || defaultLoc.location,
        eventSpanFromLat: fv.eventSpanFromLat ?? (spanFromLocation ? null : defaultLoc.lat),
        eventSpanFromLng: fv.eventSpanFromLng ?? (spanFromLocation ? null : defaultLoc.lng),
        eventSpanFromZoom: fv.eventSpanFromZoom ?? (spanFromLocation ? null : defaultLoc.zoom),

        eventSpanToDate: fv.eventSpanToDate || '',
        eventSpanToTime: fv.eventSpanToTime || '12:00:00',
        eventSpanToLocation: spanToLocation || defaultLoc.location,
        eventSpanToLat: fv.eventSpanToLat ?? (spanToLocation ? null : defaultLoc.lat),
        eventSpanToLng: fv.eventSpanToLng ?? (spanToLocation ? null : defaultLoc.lng),
        eventSpanToZoom: fv.eventSpanToZoom ?? (spanToLocation ? null : defaultLoc.zoom),

        eraId,
        expId,
        startsExpId,
        endsExpId: null,

        // LOCATION INHERITANCE FLAGS
        locationInherited: locInherited,
        spanFromLocationInherited: spanFromInherited,
        spanToLocationInherited: spanToInherited
    };

    try {
        const result = await insertHistoryRow(actor, data, { isLog: false });
        return result.id;
    } catch (e) {
        console.error('[submitNewRow] Insert failed:', e);
        return null;
    }
}