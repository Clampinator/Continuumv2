import { Translator } from '../../../../temporal-translator/temporal-translator.js';
import { buildContextOptions } from './build-context-options.js';
import { getActorHistory } from '../../../../state/get-actor-history.js';
import { resolveEventEra } from '../../../../temporal-kernel/resolve-event-era.js';
import { resolveDefaultLocation } from '../../../../temporal-kernel/resolve-default-location.js';

/**
 * SPAN TEMPLATE DATA PROVIDER
 * ENFORCES: Pure Fact Reporting.
 * TTL PURITY: Stripped of all math and string-parsing.
 */
export function getTemplateData(actor, params) {
    const { mode, existingData, viewState, graphData } = params;
    
    // 1. Resolve Narrative Identity
    const record = (mode === 'edit' && existingData) ? (existingData.record || existingData) : {};
    const eventIsSpan = Boolean(params.eventIsSpan || record.eventIsSpan || (viewState && viewState.activeDragType === 'span'));

    // 2. Prepare Raw Facts for Translation
    const rawFacts = {
        eventAge: (existingData?.x !== undefined) ? existingData.x : (existingData?.eventAge !== undefined ? existingData.eventAge : (params.ageRaw !== undefined ? params.ageRaw : (graphData?.nowNode?.eventAge || 0))),
        ts: (existingData?.y !== undefined) ? existingData.y : (record.ts || (eventIsSpan ? params.departure?.eventTime :  null) || params.timeRaw || params.time || 0),
        arrivalTs: (existingData?.arrivalY !== undefined) ? existingData.arrivalY : (record.arrivalTs || (eventIsSpan ? params.timeRaw : (record.ts || params.timeRaw))),
        eventIsSpan,
        eventTitle: record.eventTitle || (eventIsSpan ? "Span" : "Event")
    };

    // 3. TRANSLATION GATEWAY
    const history = getActorHistory(actor);
    const humanStrings = Translator.toHuman(rawFacts, history, actor);

    // 4. Permission Logic
    let canSeeSpan = true;
    try {
        canSeeSpan = actor.getFlag('continuum-v2', 'playersCanSeeSpan') ?? actor.getFlag('continuum', 'playersCanSeeSpan') ?? true;
    } catch (e) {
        console.warn("SpanGraph | getFlag failed:", e);
    }

    // 5. Narrative Context
    let eraId = existingData?.eraId || params.eraId;
    if (!eraId || eraId === 'default') {
        const ageForEra = (existingData?.x !== undefined) ? existingData.x : (params.ageRaw !== undefined ? params.ageRaw : 0);
        eraId = resolveEventEra(actor.system.eras, ageForEra);
    }
    const expId = existingData?.expId || params.expId;
    const ageForContext = (existingData?.x !== undefined) ? existingData.x : (params.ageRaw !== undefined ? params.ageRaw : 0);
    const contextResult = buildContextOptions(actor, eraId, expId, ageForContext);

    // 6. Location auto-fill (same logic as event dialog)
    const isNewEvent = mode !== 'edit';
    const defaultLoc = isNewEvent
        ? resolveDefaultLocation(history, rawFacts.eventAge, actor)
        : {
            location: record.eventLocation || record.eventSpanFromLocation || '',
            lat: record.eventSpanFromLat ?? record.lat ?? null,
            lng: record.eventSpanFromLng ?? record.lng ?? null,
            zoom: record.eventSpanFromZoom ?? record.zoom ?? null
        };

    // 7. Fact Assembly
    const data = {
        ...humanStrings,
        eventDate: humanStrings.date,
        eventTime: humanStrings.time,
        mode,
        isLogMode: mode === 'log',
        eventNotes: record.eventNotes || record.description || "",
        eventIsRest: !!record.eventIsRest,
        eraName: contextResult.eraName,
        experienceOptions: contextResult.experienceOptions,
        lifecycleHtml: contextResult.lifecycleHtml,
        defaultNewExpName: contextResult.defaultNewExpName,
        eraId: contextResult.eraId || eraId,
        expId,
        ageRaw: rawFacts.eventAge,
        timeRaw: rawFacts.ts,
        canSeeSpan,

        // Level location (departure mirrors spanFrom for non-span events)
        lat: record.lat ?? defaultLoc.lat,
        lng: record.lng ?? defaultLoc.lng,
        zoom: record.zoom ?? defaultLoc.zoom,

        // Span departure location
        spanFromLat: record.eventSpanFromLat ?? defaultLoc.lat,
        spanFromLng: record.eventSpanFromLng ?? defaultLoc.lng,
        spanFromZoom: record.eventSpanFromZoom ?? defaultLoc.zoom,

        // Span arrival location
        spanToLat: record.eventSpanToLat ?? defaultLoc.lat,
        spanToLng: record.eventSpanToLng ?? defaultLoc.lng,
        spanToZoom: record.eventSpanToZoom ?? defaultLoc.zoom
    };

    return data;
}
