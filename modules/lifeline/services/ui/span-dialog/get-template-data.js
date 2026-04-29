import { Translator } from '../../../../temporal-translator/temporal-translator.js';
import { buildContextOptions } from './build-context-options.js';
import { getActorHistory } from '../../../../state/get-actor-history.js';

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
    // We normalize different input types into a single "Bag of Facts"
    // AUTHORITY: Favor physical coordinates (x, y) if they exist, as they are the Engine's source of truth.
    const rawFacts = {
        eventAge: (existingData?.x !== undefined) ? existingData.x : (existingData?.eventAge !== undefined ? existingData.eventAge : (params.ageRaw !== undefined ? params.ageRaw : (graphData?.nowNode?.eventAge || 0))),
        ts: (existingData?.y !== undefined) ? existingData.y : (record.ts || (eventIsSpan ? params.departure?.eventTime :  null) || params.timeRaw || params.time || 0),
        arrivalTs: (existingData?.arrivalY !== undefined) ? existingData.arrivalY : (record.arrivalTs || (eventIsSpan ? params.timeRaw : (record.ts || params.timeRaw))),
        eventIsSpan,
        eventTitle: record.eventTitle || (eventIsSpan ? "Span" : "Event")
    };

    // 3. TRANSLATION GATEWAY
    // The UI does not know how to format strings. It asks the Translator.
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
    const eraId = existingData?.eraId || params.eraId;
    const expId = existingData?.expId || params.expId;

    // 6. Fact Assembly
    const data = {
        ...humanStrings,
        eventDate: humanStrings.date,
        eventTime: humanStrings.time,
        mode,
        isLogMode: mode === 'log',
        eventNotes: record.eventNotes || record.description || "",
        eventIsRest: !!record.eventIsRest,
        defaultNewExpName: eventIsSpan ? "Parallel Project" : "New Experience",
        contextOptions: buildContextOptions(actor, eraId, expId),
        eraId,
        expId,
        ageRaw: rawFacts.eventAge,
        timeRaw: rawFacts.ts,
        canSeeSpan
    };

    return data;
}
