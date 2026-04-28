import { convertTimestampToDateString } from '/systems/continuum-v2/modules/span-graph-utils/provide-span-graph-utils.js';
import { insertHistoryRow } from '../../../../state/insert-history-row.js';
import { updateHistoryRow } from '../../../../state/update-history-row.js';
import { Sound } from '/systems/continuum-v2/modules/sound-manager.js';

/**
 * AUTHORITATIVE SUBMIT HANDLER
 * Bridges the Event Dialog to the Atomic State Layer.
 * ENFORCES: Pure Pipe (No coordinate math, no logic).
 */
export async function handleSubmit(actor, formData, params) {
    const { mode, existingData } = params;

    // 1. Prepare the Fact Pass (Raw inputs from UI)
    
    // AUTHORITY: Check for physical evidence of a Span (Vertical Displacement).
    // If the Arrival facts differ from the Departure facts, it IS a span.
    const hasSpanFacts = (formData.eventSpanToDate && formData.eventSpanToDate !== formData.eventSpanFromDate) ||
                         (formData.eventSpanToTime && formData.eventSpanToTime !== formData.eventSpanFromTime);

    // HANDSHAKE: Honor the intent from the drag (params) OR the manual override (checkbox).
    const eventIsSpan = Boolean(formData.eventIsSpan || params.eventIsSpan || hasSpanFacts);

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
        eraId: formData.eraId || params.eraId,
        expId: formData.expId || params.expId
    };

    // 2. Route to Atomic State Layer (Where physics/sorting actually happens)
    if (mode === 'edit' && existingData?.id) {
        await updateHistoryRow(actor, existingData.id, data);
    } else {
        const isLog = (mode === 'log');
        await insertHistoryRow(actor, data, { isLog });
    }

    Sound.confirm();
    return { positionChanged: true };
}
