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
    // flattenEvents preserves eraId and expId on each event object
    const history = flattenEvents(rawEras);

    // 2. Process through the new Temporal Engine (Brain)
    const state = getTemporalState(history, subjectiveNow);

    // 3. Prep Metadata lookups
    const expNames = {};
    const eraNames = {};
    const allExperiences = [];

    Object.entries(rawEras).forEach(([eraId, era]) => {
        eraNames[eraId] = era.name || `Era ${eraId}`;
        
        Object.entries(era.experiences || {}).forEach(([expId, exp]) => {
            expNames[expId] = exp.name || 'Unnamed Experience';
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

    // 4. Map to Spreadsheet Rows
    const rows = state.events.map(event => {
        return {
            ...event,
            eventId: event.id,
            // ATTACH NAMES: Ensure the UI can see the labels
            eraName: event.eraId ? eraNames[event.eraId] : '',
            expName: event.expId ? expNames[event.expId] : '',
            ageFormatted: event.age > 0 ? formatSubjectiveAge(event.age) : 'Birth',
            date: event.isSpan ? (event.spanFromDate || '') : (event.date || ''),
            time: event.isSpan ? (event.spanFromTime || '') : (event.time || ''),
            notes: event.notes || event.description || '',
            location: event.isSpan ? (event.spanFromLocation || '') : (event.location || ''),
            projectedTime: event.projectedTime
        };
    });

    const allEras = Object.entries(rawEras)
        .map(([eraId, era]) => ({ eraId, name: era.name || eraId, sort: Number(era.sort || 0) }))
        .sort((a, b) => a.sort - b.sort);

    return { rows, allExperiences, allEras };
}
