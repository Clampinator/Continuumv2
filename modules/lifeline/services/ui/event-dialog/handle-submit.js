import { timestampToDateString } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { insertHistoryRow } from '../../../../state/insert-history-row.js';
import { updateHistoryRow } from '../../../../state/update-history-row.js';
import { Sound } from '/systems/continuum-v2/modules/sound-manager.js';
import { resolveContext } from './handle-submit/resolve-context.js';
import { handleNewExperience } from './handle-submit/experience-lifecycle.js';
import { processExperienceLifecycle } from './handle-submit/experience-lifecycle.js';
import { pushSnapshot } from '../../../../lifeline/undo-manager.js';

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

    // AUTHORITY: Check for physical evidence of a Span (Vertical Displacement).
    // If the Arrival facts differ from the Departure facts, it IS a span.
    const hasSpanFacts = (formData.eventSpanToDate && formData.eventSpanToDate !== formData.eventSpanFromDate) ||
                         (formData.eventSpanToTime && formData.eventSpanToTime !== formData.eventSpanFromTime);

    // HANDSHAKE: Honor the intent from the drag (params) OR the manual override (checkbox).
    // PHYSICS VETO: If the dialog was opened with spanDisabled (Level Breath or Rank 0),
    // force eventIsSpan to false regardless of user intent. The span checkbox is
    // disabled in the template, but we also enforce it here as a safety net.
    const spanDisabled = Boolean(formData.spanDisabled || params.spanDisabled);
    const eventIsSpan = spanDisabled ? false : Boolean(formData.eventIsSpan || params.eventIsSpan || hasSpanFacts);

    // DEBUG: Span insert confirmed - compare drag coords vs form data
    if (params.mode === 'insert' && eventIsSpan) {
        const dragDeparture = params.departure ? { age: params.departure.eventAge, time: params.departure.eventTime } : null;
        const dragArrival = params.arrival ? { age: params.arrival.eventAge, time: params.arrival.eventTime } : null;
        console.warn('[INSERT-SPAN] 4-CONFIRMED (dialog submit)', JSON.stringify({
            eventIsSpan,
            spanDisabled,
            hasSpanFacts,
            formDataEventIsSpan: formData.eventIsSpan,
            paramsEventIsSpan: params.eventIsSpan,
            eventAge: formData.eventAge || params.ageRaw || 0,
            eventSpanFromDate: formData.eventSpanFromDate,
            eventSpanFromTime: formData.eventSpanFromTime,
            eventSpanToDate: formData.eventSpanToDate,
            eventSpanToTime: formData.eventSpanToTime,
            dragDeparture,
            dragArrival,
            dragDepartureMinusArrival: dragDeparture && dragArrival ? dragDeparture.time - dragArrival.time : null,
            insertionContext: params.insertionContext
                ? { departureAge: params.insertionContext.departureAge, departureTime: params.insertionContext.departureTime }
                : null
        }));
    }

    const data = {
        eventTitle: formData.eventTitle || (eventIsSpan ? "New Span" : "New Event"),
        eventNotes: formData.eventNotes || "",
        eventIsSpan: eventIsSpan,
        eventIsRest: Boolean(formData.eventIsRest),
        
        // Narrative Sequencing (Age is treated as a narrative anchor)
        eventAge: formData.eventAge || params.ageRaw || 0,

        // Level Facts (Departure plane)
        eventDate: formData.eventDate || formData.eventSpanFromDate || "",
        eventTime: formData.eventTime || formData.eventSpanFromTime || "12:00:00",
        eventLocation: formData.eventLocation || formData.eventSpanFromLocation || "",

        // Span Facts (Departure/Arrival)
        eventSpanFromDate: formData.eventSpanFromDate || "",
        eventSpanFromTime: formData.eventSpanFromTime || "12:00:00",
        eventSpanFromLocation: formData.eventSpanFromLocation || "",
        
        eventSpanToDate: formData.eventSpanToDate || "",
        eventSpanToTime: formData.eventSpanToTime || "12:00:00",
        eventSpanToLocation: formData.eventSpanToLocation || "",

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
            : (existingData?.record?.endsExpId || existingData?.endsExpId || null)
    };

    // 4. Route to Atomic State Layer (Where physics/sorting actually happens)
    if (mode === 'edit' && existingData?.id) {
        // ARRIVAL EDIT: When the user right-clicked the arrival node of a span,
        // reconstruct full span data so Translator.toAtomic reads the preserved
        // departure and the new arrival. This is dialog logic (assembling the
        // correct form data), NOT state logic.
        if (existingData._editArrivalOnly && existingData.record?.eventIsSpan) {
            data.eventIsSpan = true;
            data.eventAge = existingData.record.eventAge;
            data.eventDate = existingData.record.eventDate;
            data.eventTime = existingData.record.eventTime;
            data.eventLocation = existingData.record.eventLocation;
            data.eventSpanFromDate = existingData.record.eventSpanFromDate || existingData.record.eventDate;
            data.eventSpanFromTime = existingData.record.eventSpanFromTime || existingData.record.eventTime;
            data.eventSpanFromLocation = existingData.record.eventSpanFromLocation || "";
            data.eventSpanToDate = data.eventDate;
            data.eventSpanToTime = data.eventTime;
            data.eventSpanToLocation = data.eventSpanToLocation || existingData.record.eventSpanToLocation || "";
        }
        await updateHistoryRow(actor, existingData.id, data);
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