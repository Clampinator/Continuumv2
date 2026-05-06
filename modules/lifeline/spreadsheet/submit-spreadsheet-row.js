import { findEventPath } from './data-utils.js';
import { pushSnapshot } from '../undo-manager.js';
import { insertHistoryRow } from '../../state/insert-history-row.js';
import { updateHistoryRow } from '../../state/update-history-row.js';
import { resolveEventEra } from '../../temporal-kernel/resolve-event-era.js';
import { parseObjectiveTime } from '../../temporal-translator/coordinate-converter.js';
import { resolveLocationContext } from '../../temporal-translator/location-resolver.js';

/**
 * Processes a single field update on an existing event row.
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
    const data = {
        eventTitle: fv.eventTitle || (eventIsSpan ? 'New Span' : 'New Event'),
        eventNotes: fv.eventNotes || '',
        eventIsSpan: eventIsSpan,
        eventIsRest: Boolean(fv.eventIsRest),

        eventAge,

        eventDate: fv.date || fv.eventSpanFromDate || '',
        eventTime: fv.time || '12:00:00',
        eventLocation: fv.location || '',

        eventSpanFromDate: fv.eventSpanFromDate || '',
        eventSpanFromTime: fv.eventSpanFromTime || '12:00:00',
        eventSpanFromLocation: fv.eventSpanFromLocation || '',
        eventSpanToDate: fv.eventSpanToDate || '',
        eventSpanToTime: fv.eventSpanToTime || '12:00:00',
        eventSpanToLocation: fv.eventSpanToLocation || '',

        eraId,
        expId,
        startsExpId,
        endsExpId: null,

        // Location fields for map pin
        lat: fv.lat ?? null,
        lng: fv.lng ?? null,
        zoom: fv.zoom ?? null,
        eventSpanFromLat: fv.eventSpanFromLat ?? null,
        eventSpanFromLng: fv.eventSpanFromLng ?? null,
        eventSpanFromZoom: fv.eventSpanFromZoom ?? null,
        eventSpanToLat: fv.eventSpanToLat ?? null,
        eventSpanToLng: fv.eventSpanToLng ?? null,
        eventSpanToZoom: fv.eventSpanToZoom ?? null
    };

    try {
        const result = await insertHistoryRow(actor, data, { isLog: false });
        return result.id;
    } catch (e) {
        console.error('[submitNewRow] Insert failed:', e);
        return null;
    }
}