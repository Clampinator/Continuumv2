import { formatSubjectiveAge } from '../../span-graph-utils/provide-span-graph-utils.js';
import { flattenEvents } from '../../span-graph-data-processor.js';
import { getTemporalState } from '../../temporal-engine/get-temporal-state.js';

/**
 * Reads actor.system.eras, flattens all events using the new Temporal Engine,
 * and prepares them for spreadsheet rendering.
 * 
 * @param {Actor} actor - The Foundry VTT actor.
 * @returns {Object} {rows, allExperiences, allEras}
 */
export function getSpreadsheetRows(actor) {
    const rawEras = actor.system.eras || {};
    const subjectiveNow = Number(actor.system.personal?.subjectiveNow) || 0;

    // 1. Get Flattened canonical history
    const history = flattenEvents(rawEras);

    // 2. Process through the new Temporal Engine (Brain)
    const state = getTemporalState(history, subjectiveNow);

    // 3. Map to Spreadsheet Rows
    const rows = state.events.map(event => {
        return {
            ...event,
            eventId: event.id,
            ageFormatted: event.age > 0 ? formatSubjectiveAge(event.age) : 'Birth',
            // Display date/time from the event record
            date: event.isSpan ? (event.spanFromDate || '') : (event.date || ''),
            time: event.isSpan ? (event.spanFromTime || '') : (event.time || ''),
            // Notes fallback
            notes: event.notes || event.description || '',
            // Location fallback
            location: event.isSpan ? (event.spanFromLocation || '') : (event.location || ''),
            // Engine projection (The Authority)
            projectedTime: event.projectedTime
        };
    });

    // 4. Prep Hierarchical metadata (for dropdowns/grouping)
    const allExperiences = [];
    Object.entries(rawEras).forEach(([eraId, era]) => {
        Object.entries(era.experiences || {}).forEach(([expId, exp]) => {
            if (exp.name) {
                allExperiences.push({
                    eraId, expId,
                    name: exp.name,
                    isOpen: !exp.dateTo || !exp.dateTo.trim(),
                    sort: Number(era.sort || 0) * 10000 + Number(exp.sort || 0)
                });
            }
        });
    });

    const allEras = Object.entries(rawEras)
        .map(([eraId, era]) => ({ eraId, name: era.name || eraId, sort: Number(era.sort || 0) }))
        .sort((a, b) => a.sort - b.sort);

    return { rows, allExperiences, allEras };
}
