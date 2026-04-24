import { convertTimestampToDateString } from '/systems/continuum-v2/modules/span-graph-utils/provide-span-graph-utils.js';
import { insertHistoryRow } from '../../../../state/insert-history-row.js';
import { updateHistoryRow } from '../../../../state/update-history-row.js';
import { Sound } from '/systems/continuum-v2/modules/sound-manager.js';

/**
 * AUTHORITATIVE SUBMIT HANDLER
 * Bridges the Event Dialog to the Atomic State Layer.
 */
export async function handleSubmit(actor, formData, params) {
    const { mode, existingData } = params;

    // 1. Prepare the Fact Pass
    const isSpan = Boolean(params.isSpan || formData.isSpan);
    
    let fallbackFromDate = params.date || "";
    let fallbackFromTime = params.time || "12:00:00";

    if (isSpan && params.startWorld) {
        const fromDT = convertTimestampToDateString(params.startWorld.time);
        fallbackFromDate = fromDT.date;
        fallbackFromTime = fromDT.time;
    }

    const data = {
        title: formData.title || (isSpan ? "New Span" : "New Event"),
        notes: formData.notes || "",
        age: Number(formData.age) || params.ageRaw || 0,
        date: formData.date || params.date || "",
        time: formData.time || params.time || "12:00:00",
        isSpan: isSpan,
        isRest: Boolean(formData.isRest),
        // If it's a span, we need both departure and arrival coordinates
        spanFromDate: isSpan ? (formData.spanFromDate || fallbackFromDate) : "",
        spanFromTime: isSpan ? (formData.spanFromTime || fallbackFromTime) : "",
        spanToDate: isSpan ? (formData.spanToDate || formData.date || params.date || "") : "",
        spanToTime: isSpan ? (formData.spanToTime || formData.time || params.time || "12:00:00") : ""
    };

    // 2. Route to Atomic State Layer
    if (mode === 'edit' && existingData?.id) {
        await updateHistoryRow(actor, existingData.id, data);
    } else {
        const isLog = (mode === 'log');
        await insertHistoryRow(actor, data, { isLog });
    }

    Sound.confirm();
    return { positionChanged: true };
}
