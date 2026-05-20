import { timestampToDateString } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { insertHistoryRow } from '../../../../state/insert-history-row.js';
import { updateHistoryRow } from '../../../../state/update-history-row.js';
import { Sound } from '/systems/continuum-v2/modules/sound-manager.js';
import { resolveContext } from './handle-submit/resolve-context.js';
import { handleNewExperience } from './handle-submit/experience-lifecycle.js';
import { processExperienceLifecycle } from './handle-submit/experience-lifecycle.js';
import { pushSnapshot } from '../../../../lifeline/undo-manager.js';
import { classifyEventType } from '../../../../temporal-kernel/classify-event-type.js';
import { resolveLocationInheritance } from '../../../../temporal-kernel/resolve-location-inheritance.js';
import { getActorHistory } from '../../../../state/get-actor-history.js';
import { computeNowPosition } from '../../../../temporal-kernel/compute-now-position.js';

/**
 * AUTHORITATIVE SUBMIT HANDLER
 * Bridges the Event Dialog to the Atomic State Layer.
 * ENFORCES: Pure Pipe (No coordinate math, no logic).
 *
 * Orchestration order:
 *   1. Resolve context (era/experience from form or params)
 *   2. Handle experience lifecycle (create new, close, reopen)
 *   3. Insert/update the event row with the resolved expId
 */
export async function handleSubmit(actor, formData, params) {
    const { mode, existingData } = params;

    // Snapshot before any writes so this entire logical operation is one undo step
    pushSnapshot(actor);

    // 1. Resolve Context (which era/experience does this event belong to?)
    const { targetEraId, targetExpId: initialExpId } = resolveContext(actor, formData, params);

    // 2. Experience Lifecycle (must happen BEFORE event insertion
    //    so the new experience exists in the DB and the event can
    //    reference it via expId/startsExpId)
    const updates = {};
    const anchorDate = formData.eventDate || formData.eventSpanFromDate || '';
    const anchorTime = formData.eventTime || formData.eventSpanFromTime || '12:00:00';
    const anchorFull = anchorTime ? `${anchorDate} ${anchorTime}` : anchorDate;

    // Genesis: Create a new experience if the user checked "Start a New Experience here"
    const newExpId = handleNewExperience(actor, formData, updates, targetEraId, anchorFull);

    // Lifecycle: Close/reopen existing experiences
    // Returns { eraId, expId } pairs for closed experiences so we can
    // stamp endsExpId on the closing event and clear its expId.
    const closedExpObjects = processExperienceLifecycle(actor, formData, updates, anchorFull);
    const closedExpIds = closedExpObjects.map(o => o.expId);

    // Merge any experience updates before event insertion
    if (Object.keys(updates).length > 0) {
        await actor.update(updates);
    }

    // The event's expId is: newly created experience > form selection > params.
    // If the selected experience was just closed, the event exits that experience
    // and becomes era-level (expId = null). Closing an experience means you have
    // left it, so this event should not remain inside the closed experience.
    let resolvedExpId = newExpId || initialExpId;
    if (resolvedExpId && closedExpIds.includes(resolvedExpId)) {
        resolvedExpId = null;
    }

    // 3. Prepare the Fact Pass (Raw inputs from UI)

    // KERNEL AUTHORITY: Classify the event type from raw form facts.
    // The Kernel determines hasSpanFacts and applies the physics veto.
    // The UI passes raw values through without interpreting them.
    const { eventIsSpan, isPulled, hasSpanFacts } = classifyEventType(
        {
            eventIsSpan: formData.eventIsSpan || params.eventIsSpan,
            isPulled: formData.isPulled,
            eventSpanFromDate: formData.eventSpanFromDate,
            eventSpanToDate: formData.eventSpanToDate,
            eventSpanFromTime: formData.eventSpanFromTime,
            eventSpanToTime: formData.eventSpanToTime,
            eventDate: formData.eventDate || formData.eventSpanFromDate,
            eventTime: formData.eventTime || formData.eventSpanFromTime,
            eventLocation: formData.eventLocation || formData.eventSpanFromLocation,
            eventSpanFromLocation: formData.eventSpanFromLocation
        },
        { spanDisabled: Boolean(formData.spanDisabled || params.spanDisabled) }
    );

    // LOCATION INHERITANCE: The Kernel is the sole authority for determining
    // whether a location was inherited (auto-filled) or manually set.
    // The UI is a dumb pipe - it passes form values through without
    // interpreting them. The Kernel resolves the default location at
    // this age, parses the eventAge (which may be a formatted string
    // from the form), and compares submitted values against the default.
    const historyForInheritance = getActorHistory(actor);
    const oldRecord = (mode === 'edit' && existingData) ? (existingData.record || existingData) : null;

    const inheritance = resolveLocationInheritance(
        historyForInheritance,
        {
            eventAge: formData.eventAge || params.ageRaw || 0,
            eventLocation: formData.eventLocation || formData.eventSpanFromLocation || "",
            eventSpanFromLocation: formData.eventSpanFromLocation || "",
            eventSpanToLocation: formData.eventSpanToLocation || ""
        },
        oldRecord,
        actor
    );

    const eventLocation = formData.eventLocation || formData.eventSpanFromLocation || "";
    const eventSpanFromLocation = formData.eventSpanFromLocation || "";
    const eventSpanToLocation = formData.eventSpanToLocation || "";

    // EDIT PRESERVATION: When editing, preserve the existing eventNotes if the
    // form field is empty. FormDataExtended may return an empty string for a
    // textarea that wasn't properly populated, or the user may have cleared it.
    // In either case, we must not overwrite existing notes with an empty string
    // unless the form explicitly had content. For new events, use form value directly.
    const existingNotes = (mode === 'edit' && existingData) ? (existingData.record?.eventNotes || existingData.record?.description || "") : "";
    const preservingNotes = formData.eventNotes || formData.description || existingNotes || "";

    // data must be let because the _editArrivalOnly path reassigns it
    let data = {
        eventTitle: formData.eventTitle || (eventIsSpan ? "New Span" : "New Event"),
        eventNotes: preservingNotes,
        eventIsSpan: eventIsSpan,
        eventIsRest: Boolean(formData.eventIsRest),
        // PULLED SPAN: When true, another spanner carried this character.
        // Only meaningful when eventIsSpan is true. Kernel enforces this.
        isPulled: isPulled,
        
        // Narrative Sequencing (Age is treated as a narrative anchor)
        eventAge: formData.eventAge || params.ageRaw || 0,

        // Level Facts (Departure plane)
        eventDate: formData.eventDate || formData.eventSpanFromDate || "",
        eventTime: formData.eventTime || formData.eventSpanFromTime || "12:00:00",
        eventLocation,
        lat: formData.eventLat ? Number(formData.eventLat) : null,
        lng: formData.eventLng ? Number(formData.eventLng) : null,
        zoom: formData.eventZoom ? Number(formData.eventZoom) : null,

        // Span Facts (Departure/Arrival)
        eventSpanFromDate: formData.eventSpanFromDate || "",
        eventSpanFromTime: formData.eventSpanFromTime || "12:00:00",
        eventSpanFromLocation,
        eventSpanFromLat: formData.spanFromLat ? Number(formData.spanFromLat) : null,
        eventSpanFromLng: formData.spanFromLng ? Number(formData.spanFromLng) : null,
        eventSpanFromZoom: formData.spanFromZoom ? Number(formData.spanFromZoom) : null,
        
        eventSpanToDate: formData.eventSpanToDate || "",
        eventSpanToTime: formData.eventSpanToTime || "12:00:00",
        eventSpanToLocation,
        eventSpanToLat: formData.spanToLat ? Number(formData.spanToLat) : null,
        eventSpanToLng: formData.spanToLng ? Number(formData.spanToLng) : null,
        eventSpanToZoom: formData.spanToZoom ? Number(formData.spanToZoom) : null,

        // Structural Facts
        eraId: targetEraId,
        expId: resolvedExpId,

        // Genesis link: mark this event as the opener of a new experience
        startsExpId: newExpId || null,

        // Exodus link: mark this event as the closer of an experience.
        // When you close an experience, you leave it. This event is the
        // exodus point - the moment the character walked out. The expId
        // is set to null (era-level), but endsExpId records which
        // experience was closed so the span graph can anchor the box's
        // right edge to this node.
        // New closes override; on edit, preserve existing unless a new
        // close just happened.
        endsExpId: closedExpObjects.length > 0
            ? closedExpObjects[0].expId
            : (existingData?.record?.endsExpId || existingData?.endsExpId || null),

        // LOCATION INHERITANCE FLAGS (from Kernel)
        locationInherited: inheritance.locationInherited,
        spanFromLocationInherited: inheritance.spanFromLocationInherited,
        spanToLocationInherited: inheritance.spanToLocationInherited
    };

    // 4. Route to Atomic State Layer (Where physics/sorting actually happens)
    if (mode === 'edit' && existingData?.id) {
        // INTENT FLAG: _departureChanged tells the State layer whether the user
        // actually changed the departure date/time. Without this, editing a span's
        // title or notes would trigger adjustSpanOnDepartureEdit from TTL micro-drift,
        // cascading the compensation wave through every downstream node.
        if (eventIsSpan && existingData.record) {
            const oldFromDate = existingData.record.eventSpanFromDate || existingData.record.eventDate || '';
            const oldFromTime = existingData.record.eventSpanFromTime || existingData.record.eventTime || '';
            const newFromDate = data.eventSpanFromDate || data.eventDate || '';
            const newFromTime = data.eventSpanFromTime || data.eventTime || '';
            if (newFromDate !== oldFromDate || newFromTime !== oldFromTime) {
                data._departureChanged = true;
            }
        }

        // ARRIVAL EDIT: When the user right-clicked the arrival node of a span,
        // reconstruct full span data so Translator.toAtomic reads the preserved
        // departure and the new arrival. This is dialog logic (assembling the
        // correct form data), NOT state logic.
        //
        // MUST use object spread so form values (data.eventDate, data.eventTime)
        // are captured BEFORE the departure overwrites. Sequential mutation would
        // overwrite data.eventDate with the departure, then read the departure
        // as the span arrival destination.
        if (existingData._editArrivalOnly && existingData.record?.eventIsSpan) {
            const arrivalDate = data.eventDate;
            const arrivalTime = data.eventTime;
            const arrivalLocation = data.eventSpanToLocation || existingData.record.eventSpanToLocation || "";
            // Recompute spanToLocationInherited for arrival-only edit:
            // if the arrival location differs from the old record, it was
            // manually changed -> false. If unchanged, preserve old flag.
            const oldSpanToLoc = existingData.record.eventSpanToLocation || '';
            const arrivalLocInherited = arrivalLocation === oldSpanToLoc
                ? (existingData.record.spanToLocationInherited !== false)
                : false;
            data = {
                ...data,
                _editArrivalOnly: true,
                eventIsSpan: true,
                eventAge: existingData.record.eventAge,
                eventDate: existingData.record.eventDate,
                eventTime: existingData.record.eventTime,
                eventLocation: existingData.record.eventLocation,
                lat: existingData.record.lat ?? null,
                lng: existingData.record.lng ?? null,
                zoom: existingData.record.zoom ?? null,
                eventSpanFromDate: existingData.record.eventSpanFromDate || existingData.record.eventDate,
                eventSpanFromTime: existingData.record.eventSpanFromTime || existingData.record.eventTime,
                eventSpanFromLocation: existingData.record.eventSpanFromLocation || "",
                eventSpanFromLat: existingData.record.eventSpanFromLat ?? null,
                eventSpanFromLng: existingData.record.eventSpanFromLng ?? null,
                eventSpanFromZoom: existingData.record.eventSpanFromZoom ?? null,
                eventSpanToDate: arrivalDate,
                eventSpanToTime: arrivalTime,
                eventSpanToLocation: arrivalLocation,
                eventSpanToLat: data.eventSpanToLat ?? existingData.record.eventSpanToLat ?? null,
                eventSpanToLng: data.eventSpanToLng ?? existingData.record.eventSpanToLng ?? null,
                eventSpanToZoom: data.eventSpanToZoom ?? existingData.record.eventSpanToZoom ?? null,
                // Preserve level and spanFrom flags; recompute spanTo
                locationInherited: existingData.record.locationInherited !== false,
                spanFromLocationInherited: existingData.record.spanFromLocationInherited !== false,
                spanToLocationInherited: arrivalLocInherited,
            };
        }
        await updateHistoryRow(actor, existingData.id, data);

        // NOW SYNC: When editing the last event in history, its timestamps
        // determine the NOW position. Edit mode does not call
        // computeNowPosition (unlike insert's isLog path), so we must
        // sync manually. Without this, objectiveNow retains the old
        // arrival/departure time and the NOW node drifts away from the
        // last event after a span arrival edit.
        const postEditHistory = getActorHistory(actor);
        const lastRealEvent = postEditHistory
            .filter(n => !n.isNow && !n.isBirth)
            .pop();
        if (lastRealEvent && lastRealEvent.id === existingData.id) {
            const atomic = lastRealEvent.record;
            const nowPos = computeNowPosition(atomic);
            await actor.update({
                'system.personal.objectiveNow': nowPos.objectiveNow,
                'system.personal.subjectiveNow': nowPos.subjectiveNow
            });
        }
        // LOCATION CASCADE is now handled inside update-history-row.js
        // (with geocoded coordinates from _enrichCoordinates), so we no
        // longer need a separate cascade here. The state layer cascade
        // uses finalRecord which has enriched lat/lng values.
    } else {
        const isLog = (mode === 'log');
        await insertHistoryRow(actor, data, { isLog });
    }

    // 5. Rest Logic: When rest is toggled ON, create the "End of Rest" event
    // 24 hours after the rest event. This fires after the row is committed so
    // the rest event has a valid sort position and age for the end event to
    // reference.
    const { handleRestLogic } = await import('./handle-submit/handle-rest-logic.js');
    await handleRestLogic(actor, data, existingData, { targetAgeId: targetEraId, targetExpId: initialExpId });

    Sound.confirm();
    return { positionChanged: true };
}