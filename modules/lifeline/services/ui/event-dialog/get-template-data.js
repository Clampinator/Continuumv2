import { Translator } from '../../../../temporal-translator/temporal-translator.js';
import { buildContextOptions } from '../build-context-options.js';
import { getActorHistory } from '../../../../state/get-actor-history.js';
import { getLoreContext } from '../../../../state/get-lore-context.js';
import { resolveEventEra } from '../../../../temporal-kernel/resolve-event-era.js';
import { resolveDefaultLocation } from '../../../../temporal-kernel/resolve-default-location.js';

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
    const isBreathBlocked = (isInsertMode || mode === 'edit') ? false : Boolean(predecessor?.isSpanOrigin || predecessor?.record?.eventIsSpan);
    const isRankBlocked = mode === 'edit' ? false : (lore.spanRank || 0) < 1;
    const spanDisabled = Boolean(params.spanDisabled || isBreathBlocked || isRankBlocked);
    const effectiveEventIsSpan = spanDisabled ? false : eventIsSpan;

    // 2. Resolve Narrative Context
    // Events belong to exactly one Era (or none). We resolve the era
    // from the event's position and show its name as read-only.
    // For new events (log/insert), resolve era from the event's age position.
    let eraId = existingData?.eraId || params.eraId;
    if (!eraId || eraId === 'default') {
        const ageForEra = (existingData?.x !== undefined) ? existingData.x : (params.ageRaw !== undefined ? params.ageRaw : 0);
        eraId = resolveEventEra(actor.system.eras, ageForEra);
    }
    const expId = existingData?.expId || params.expId;
    const ageForContext = (existingData?.x !== undefined) ? existingData.x : (params.ageRaw !== undefined ? params.ageRaw : 0);
    const contextResult = buildContextOptions(actor, eraId, expId, ageForContext);

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

    // 4. TRANSLATION GATEWAY
    // The UI does not know how to format strings. It asks the Translator.
    const history = getActorHistory(actor);

    const humanStrings = Translator.toHuman(rawFacts, history, actor);

    // 5. Fact Assembly
    // LOCATION AUTO-FILL: For new events (insert/log), resolve the most
    // recent location from history so the dialog shows it as the default.
    // For edit mode, use the existing record values.
    const isNewEvent = mode !== 'edit';
    const defaultLoc = isNewEvent
        ? resolveDefaultLocation(history, rawFacts.eventAge, actor)
        : {
            location: record.eventLocation || '',
            lat: record.lat ?? null,
            lng: record.lng ?? null,
            zoom: record.zoom ?? null
        };

    const data = {
        ...humanStrings,
        eventDate: humanStrings.date,
        eventTime: humanStrings.time,
        eventLocation: record.eventLocation || defaultLoc.location || humanStrings.locationContext.location || "",
        mode,
        id: existingData?.id || null,
        eventNotes: record.eventNotes || "",
        eventIsRest: Boolean(record.eventIsRest),
        
        // Level Facts
        lat: record.lat ?? defaultLoc.lat,
        lng: record.lng ?? defaultLoc.lng,
        zoom: record.zoom ?? defaultLoc.zoom,

        // Span Facts
        // Departure inherits the most recent location (character is "here")
        eventSpanFromLocation: record.eventSpanFromLocation || defaultLoc.location || "",
        eventSpanFromLat: record.eventSpanFromLat ?? defaultLoc.lat,
        eventSpanFromLng: record.eventSpanFromLng ?? defaultLoc.lng,
        eventSpanFromZoom: record.eventSpanFromZoom ?? defaultLoc.zoom,
        // Arrival also inherits for consistency (user can override)
        eventSpanToLocation: record.eventSpanToLocation || defaultLoc.location || "",
        eventSpanToLat: record.eventSpanToLat ?? defaultLoc.lat,
        eventSpanToLng: record.eventSpanToLng ?? defaultLoc.lng,
        eventSpanToZoom: record.eventSpanToZoom ?? defaultLoc.zoom,

        // UI Helpers
        eraName: contextResult.eraName,
        experienceOptions: contextResult.experienceOptions,
        lifecycleHtml: contextResult.lifecycleHtml,
        defaultNewExpName: contextResult.defaultNewExpName,
        eraId: contextResult.eraId || eraId,
        expId,
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
