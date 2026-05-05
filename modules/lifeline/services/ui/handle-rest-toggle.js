import { insertHistoryRow } from '/systems/continuum-v2/modules/state/insert-history-row.js';
import { SECONDS_IN_DAY } from '/systems/continuum-v2/modules/temporal-engine/constants.js';

/**
 * Creates an "End of Rest" event 24 hours after the given rest event.
 * Routes through insertHistoryRow (State layer) instead of bypassing
 * it with a direct actor.update() call.
 */
export async function createEndOfRestEvent(actor, sourceEvent, eraId, expId) {
    if (!sourceEvent || !sourceEvent.eventDate) return;

    // Compute end-of-rest coordinates.
    // Rest is a 1:1 progression, so age increases by exactly 24 hours.
    const endAge = (Number(sourceEvent.eventAge) || 0) + SECONDS_IN_DAY;
    const endTs = (Number(sourceEvent.ts) || 0) + (SECONDS_IN_DAY * 1000);

    // Format date/time from end timestamp
    const endDate = new Date(endTs);
    if (isNaN(endDate.getTime())) return;
    const formatZeroPad = (num) => String(num).padStart(2, '0');
    const endDateStr = `${endDate.getFullYear()}-${formatZeroPad(endDate.getMonth() + 1)}-${formatZeroPad(endDate.getDate())}`;
    const endTimeStr = `${formatZeroPad(endDate.getHours())}:${formatZeroPad(endDate.getMinutes())}`;

    // Route through State layer via insertHistoryRow
    const record = {
        eventTitle: 'End of Rest',
        eventNotes: 'Automatic rest completion.',
        eventDate: endDateStr,
        eventTime: endTimeStr,
        eventAge: endAge,
        eventIsSpan: false,
        eventIsRest: false,
        isRestEnd: true,
        eraId,
        expId
    };

    await insertHistoryRow(actor, record);
    ui.notifications.info("Created 'End of Rest' event 24 hours later.");
}

export async function handleRestToggle(sheet, event) {
    const checkbox = event.currentTarget;
    if (!checkbox.checked) return;

    const namePath = checkbox.name;
    const matches = namePath.match(/^system\.eras\.([a-zA-Z0-9]+)\.(?:experiences\.([a-zA-Z0-9]+)\.)?events\.([a-zA-Z0-9]+)\.eventIsRest$/);

    if (!matches) return;
    const [_, eraId, expId, eventId] = matches;

    let currentEvent;
    if (expId) {
        currentEvent = sheet.actor.system.eras[eraId]?.experiences[expId]?.events[eventId];
    } else {
        currentEvent = sheet.actor.system.eras[eraId]?.events[eventId];
    }

    await createEndOfRestEvent(sheet.actor, currentEvent, eraId, expId);
}