import { getActorHistory } from '../../state/get-actor-history.js';
import { getTemporalState } from '../../temporal-engine/get-temporal-state.js';
import { Translator } from '../../temporal-translator/temporal-translator.js';
import { parseObjectiveTime } from '../../temporal-translator/coordinate-converter.js';
import { resolveLocationContext } from '../../temporal-translator/location-resolver.js';

/**
 * Reads actor.system.eras, flattens all events using the Temporal Engine
 * pipeline (getActorHistory + getTemporalState), and prepares them for
 * spreadsheet rendering.
 *
 * TRINITY COMPLIANCE: Uses the canonical State -> Engine pipeline instead
 * of the deprecated flattenEvents data processor which violated Trinity
 * boundaries by performing TTL date parsing and Kernel physics recovery
 * inside a data extraction function.
 *
 * @param {Actor} actor - The Foundry VTT actor.
 * @returns {Object} {rows, allExperiences, allEras}
 */
export function getSpreadsheetRows(actor) {
    const rawEras = actor.system.eras || {};
    const subjectiveNow = Number(actor.system.personal?.subjectiveNow) || 0;

    // AUTHORITY: Resolve Birth Date timestamp as Origin Time
    const dob = actor.system.personal?.dob || "1970-01-01";
    // For Birth, we establish the context from Age 0
    const birthCtx = resolveLocationContext([], 0, actor);
    const originTime = parseObjectiveTime(dob, "12:00:00", birthCtx);

    // 1. Get canonical history (State layer - no physics, no parsing)
    const history = getActorHistory(actor);

    // 2. Process through the Temporal Engine (Kernel layer)
    const state = getTemporalState(history, subjectiveNow, originTime, actor);

    // 3. Prep Metadata lookups
    const eraLookup = {};
    const expLookup = {};
    const allExperiences = [];

    Object.entries(rawEras).forEach(([eraId, era]) => {
        eraLookup[eraId] = era.name || `Era ${eraId}`;
        
        Object.entries(era.experiences || {}).forEach(([expId, exp]) => {
            expLookup[expId] = exp.name || 'Unnamed Experience';
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

    // 4. Map to Spreadsheet Rows with explicit names
    const rows = (state.nodes || []).map((node, index) => {
        const record = node.record || node;
        const expName = expLookup[node.expId] || node.experienceName || '';

        // AUTHORITY: Use Translator for consistent display logic
        const human = Translator.toHuman({
            eventAge: node.x,
            ts: node.y,
            arrivalTs: node.arrivalY,
            eventIsSpan: !!record.eventIsSpan
        }, history, actor);
        
        return {
            ...record,
            ...human,
            location: record.eventLocation || human.locationContext.location || "",
            date: human.date,
            time: human.time,
            eventId: node.id,
            eraName: eraLookup[node.eraId] || 'Unknown Era',
            expName: expName, 
            typeLabel: record.eventIsSpan ? 'Span' : 'Event',
            eventNotes: record.eventNotes || record.description || '',
            projectedTime: node.y,
            _ageSeconds: node.x
        };
    });

    // SPREADSHEET SORT AUTHORITY: Always sort by subjective age ascending.
    // The temporal engine may order nodes by narrative/segment order,
    // but the spreadsheet view is strictly chronological by age.
    rows.sort((a, b) => (a._ageSeconds || 0) - (b._ageSeconds || 0));

    const allEras = Object.entries(rawEras)
        .map(([eraId, era]) => ({ eraId, name: era.name || eraId, sort: Number(era.sort || 0) }))
        .sort((a, b) => a.sort - b.sort);

    return { rows, allExperiences, allEras };
}
