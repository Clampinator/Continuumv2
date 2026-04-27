import { Translator } from '../../../../temporal-translator/temporal-translator.js';
import { buildContextOptions } from '../build-context-options.js';
import { getActorHistory } from '../../../../state/get-actor-history.js';

/**
 * TEMPLATE DATA PROVIDER
 * ENFORCES: Pure Fact Reporting.
 * TTL PURITY: Stripped of all math and string-parsing.
 */
export function getTemplateData(actor, params) {
    const { mode, existingData } = params;
    
    // 1. Resolve Core Identity
    const record = (mode === 'edit' && existingData) ? (existingData.record || existingData) : {};
    const eventIsSpan = Boolean(params.eventIsSpan || record.eventIsSpan);

    // 2. Resolve Narrative Context
    const eraId = existingData?.eraId || params.eraId;
    const expId = existingData?.expId || params.expId;
    const contextOptions = buildContextOptions(actor, eraId, expId);

    // 3. Prepare Raw Facts for Translation
    // We normalize different input types into a single "Bag of Facts"
    // AUTHORITY: Favor physical coordinates (x, y) if they exist, as they are the Engine's source of truth.
    const rawFacts = {
        eventAge: (existingData?.x !== undefined) ? existingData.x : (params.ageRaw || 0),
        ts: (existingData?.y !== undefined) ? existingData.y : (record.ts || params.timeRaw || params.time || 0),
        arrivalTs: (existingData?.arrivalY !== undefined) ? existingData.arrivalY : (record.arrivalTs || (eventIsSpan ? (params.arrival?.eventTime || params.timeRaw) : (record.ts || params.timeRaw))),
        eventIsSpan,
        eventTitle: record.eventTitle || (eventIsSpan ? "Span" : "Event")
    };

    // 4. TRANSLATION GATEWAY
    // The UI does not know how to format strings. It asks the Translator.
    const history = getActorHistory(actor);
    const humanStrings = Translator.toHuman(rawFacts, history, actor);

    // 5. Fact Assembly
    const data = {
        ...humanStrings,
        eventDate: humanStrings.date,
        eventTime: humanStrings.time,
        eventLocation: record.eventLocation || humanStrings.locationContext.location || "",
        mode,
        id: existingData?.id || null,
        eventNotes: record.eventNotes || "",
        eventIsRest: Boolean(record.eventIsRest),
        
        // Level Facts
        lat: record.lat, lng: record.lng, zoom: record.zoom,

        // Span Facts
        eventSpanFromLocation: record.eventSpanFromLocation || "",
        eventSpanFromLat: record.eventSpanFromLat, eventSpanFromLng: record.eventSpanFromLng, eventSpanFromZoom: record.eventSpanFromZoom,
        eventSpanToLocation: record.eventSpanToLocation || "",
        eventSpanToLat: record.eventSpanToLat, eventSpanToLng: record.eventSpanToLng, eventSpanToZoom: record.eventSpanToZoom,

        // UI Helpers
        contextOptions,
        isEdit: mode === 'edit',
        isLogMode: mode === 'log',
        isInsert: mode === 'insert'
    };

    return data;
}
