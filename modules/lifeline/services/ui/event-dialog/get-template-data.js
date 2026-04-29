import { Translator } from '../../../../temporal-translator/temporal-translator.js';
import { buildContextOptions } from '../build-context-options.js';
import { getActorHistory } from '../../../../state/get-actor-history.js';
import { getLoreContext } from '../../../../state/get-lore-context.js';

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

    // PHYSICS VETO: When spanning is physically impossible (Level Breath blocks
    // consecutive spans, or Rank 0 cannot span), force the dialog to a level event
    // and disable the span checkbox so the user cannot attempt an illegal action.
    //
    // INSERT-SPAN BREATH CHECK: For insert mode, the relevant predecessor is
    // the event immediately before the insertion point, NOT the globally last event.
    // Ghost-snap only targets level rails, so beforeNode is always a level event
    // or birth. Using lore.lastEvent would falsely block insertion when a later
    // span exists in the history.
    const lore = getLoreContext(actor);
    const isInsertMode = mode === 'insert' && params.insertionContext;
    const predecessor = isInsertMode ? params.insertionContext.beforeNode : lore.lastEvent;
    // INSERT-SPAN: Level Breath is impossible in insert mode. Ghost-snap
    // only targets level rails, so the click is always on a level segment.
    const isBreathBlocked = isInsertMode ? false : Boolean(predecessor?.isSpanOrigin || predecessor?.record?.eventIsSpan);
    const isRankBlocked = (lore.spanRank || 0) < 1;
    const spanDisabled = Boolean(params.spanDisabled || isBreathBlocked || isRankBlocked);
    const effectiveEventIsSpan = spanDisabled ? false : eventIsSpan;

    // 2. Resolve Narrative Context
    const eraId = existingData?.eraId || params.eraId;
    const expId = existingData?.expId || params.expId;
    const contextOptions = buildContextOptions(actor, eraId, expId);

    // 3. Prepare Raw Facts for Translation
    // We normalize different input types into a single "Bag of Facts"
    // AUTHORITY: Favor physical coordinates (x, y) if they exist, as they are the Engine's source of truth.
    // INSERT-SPAN: When the interaction provides departure/arrival data from a drag,
    // use those coordinates directly instead of falling back to generic timeRaw.
    // LEVEL EVENTS: A level event has no span displacement. The arrival must equal
    // the departure (same point in spacetime). If we allow arrivalTs to differ from
    // ts for level events, the dialog's hasSpanFacts check in handle-submit will
    // falsely detect a span and transform the level event into an up span.
    const departureTime = (existingData?.y !== undefined)
        ? existingData.y
        : (record.ts || (effectiveEventIsSpan ? params.departure?.eventTime : null) || params.timeRaw || 0);
    // LEVEL EVENTS: Arrival must equal departure. A level event is a single
    // spacetime point - there is no displacement. If arrival differs from
    // departure, the hasSpanFacts check in handle-submit will falsely upgrade
    // the event to a span, causing the "pops back to UP" bug.
    const arrivalTime = (existingData?.arrivalY !== undefined)
        ? existingData.arrivalY
        : (record.arrivalTs || (effectiveEventIsSpan
            ? (params.arrival?.eventTime || params.timeRaw)
            : departureTime));

    const rawFacts = {
        eventAge: (existingData?.x !== undefined) ? existingData.x : (params.ageRaw || 0),
        ts: departureTime,
        arrivalTs: arrivalTime,
        eventIsSpan: effectiveEventIsSpan,
        eventTitle: record.eventTitle || (effectiveEventIsSpan ? "Span" : "Event")
    };

    // DEBUG: Template data resolution for insert-span
    if (mode === 'insert' && effectiveEventIsSpan) {
        console.warn('[INSERT-SPAN] 3-TEMPLATE DATA (dialog render)', JSON.stringify({
            effectiveEventIsSpan,
            spanDisabled,
            isBreathBlocked,
            predecessorId: predecessor?.id,
            predecessorIsSpanOrigin: predecessor?.isSpanOrigin,
            ts: departureTime,
            arrivalTs: arrivalTime,
            departureMinusArrival: departureTime - arrivalTime,
            paramsDeparture: params.departure ? { eventAge: params.departure.eventAge, eventTime: params.departure.eventTime } : null,
            paramsArrival: params.arrival ? { eventAge: params.arrival.eventAge, eventTime: params.arrival.eventTime } : null,
            paramsTimeRaw: params.timeRaw,
            paramsAgeRaw: params.ageRaw
        }));
    }

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
        isInsert: mode === 'insert',
        // PHYSICS VETO: When spanning is blocked, disable the span checkbox.
        // canSeeSpan is always true for players to see the option but it will
        // be disabled (not hidden) when Level Breath or Rank 0 blocks it.
        canSeeSpan: true,
        spanDisabled: spanDisabled,
        // The effective eventIsSpan after physics veto, used for template visibility.
        eventIsSpan: effectiveEventIsSpan
    };

    return data;
}
