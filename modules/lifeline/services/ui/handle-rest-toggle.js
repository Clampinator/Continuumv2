import { insertHistoryRow } from '/systems/continuum-v2/modules/state/insert-history-row.js';
import { getActorHistory } from '/systems/continuum-v2/modules/state/get-actor-history.js';
import { SECONDS_IN_DAY, MS_PER_SECOND } from '/systems/continuum-v2/modules/temporal-engine/constants.js';
import { parseSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { parseObjectiveTime, formatObjectiveTime } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { resolveLocationContext } from '/systems/continuum-v2/modules/temporal-translator/location-resolver.js';

/**
 * Creates an "End of Rest" event 24 hours after the given rest event.
 * Routes through insertHistoryRow (State layer) instead of bypassing
 * it with a direct actor.update() call.
 *
 * Handles both DB-sourced events (with ts) and form-sourced events
 * (with eventDate/eventTime but no ts).
 *
 * CRITICAL: endTs is formatted with formatObjectiveTime (TTL, character-
 * timezone-aware) and also passed as a pre-computed `ts` field on the
 * record. insertHistoryRow uses the pre-computed ts directly, bypassing
 * the string round-trip that causes timezone drift when the browser's
 * local timezone differs from the character's timezone.
 *
 * After creating the End of Rest event, advances NOW to the end of rest.
 */
export async function createEndOfRestEvent(actor, sourceEvent, eraId, expId) {
    if (!sourceEvent || !sourceEvent.eventDate) return;

    // Compute end-of-rest subjective age.
    // Rest is a 1:1 progression, so age increases by exactly 24 hours.
    const sourceAge = parseSubjectiveAge(sourceEvent.eventAge);
    const endAge = sourceAge + SECONDS_IN_DAY;

    // Derive start timestamp: prefer computed ts (from DB). For form-sourced
    // events that lack ts, re-read the committed event from the actor data
    // to get the TTL-computed timestamp.
    let startTs = Number(sourceEvent.ts);
    if (!startTs) {
        startTs = findComputedTimestamp(actor, eraId, expId, sourceAge);
    }
    if (!startTs) {
        const startDate = sourceEvent.eventSpanFromDate || sourceEvent.eventDate || sourceEvent.date;
        const startTime = sourceEvent.eventSpanFromTime || sourceEvent.eventTime || sourceEvent.time || '12:00:00';
        const history = getActorHistory(actor);
        const context = resolveLocationContext(history, sourceAge, actor);
        startTs = parseObjectiveTime(startDate, startTime, context) || 0;
    }

    const endTs = startTs + (SECONDS_IN_DAY * MS_PER_SECOND);

    // Format end timestamp through the TTL using the character's timezone
    // context. This ensures the date/time strings are in the same timezone
    // that parseObjectiveTime would use, making any re-parse lossless.
    const history = getActorHistory(actor);
    const context = resolveLocationContext(history, endAge, actor);
    const formatted = formatObjectiveTime(endTs, context);

    // Route through State layer via insertHistoryRow.
    // Pass ts and arrivalTs as pre-computed absolute ms values so
    // insertHistoryRow uses them directly instead of re-parsing the
    // date/time strings (which would introduce timezone drift).
    const record = {
        eventTitle: game.i18n.localize("CONTINUUM.RestEvent.EndOfRest"),
        eventNotes: game.i18n.localize("CONTINUUM.RestEvent.AutomaticRestCompletion"),
        eventDate: formatted.date,
        eventTime: formatted.time,
        eventAge: endAge,
        eventIsSpan: false,
        eventIsRest: false,
        isRestEnd: true,
        eraId,
        expId,
        ts: endTs,
        arrivalTs: endTs
    };

    await insertHistoryRow(actor, record);

    // Advance NOW to the end of the rest duration.
    const nowUpdates = {
        'system.personal.objectiveNow': endTs,
        'system.personal.subjectiveNow': endAge
    };
    await actor.update(nowUpdates);

    ui.notifications.info(game.i18n.localize("CONTINUUM.RestEvent.CreatedEndOfRest"));
}

/**
 * Finds the computed timestamp for a rest event by searching the
 * actor's era/experience structure. After insertHistoryRow commits
 * the event, the TTL handshake populates the ts field.
 */
function findComputedTimestamp(actor, eraId, expId, sourceAge) {
    const eras = actor.system.eras || {};
    const era = eras[eraId];
    if (!era) return 0;

    const searchEvents = (events) => {
        if (!events) return 0;
        for (const evt of Object.values(events)) {
            if (evt.eventIsRest && Number(evt.eventAge) === sourceAge && Number(evt.ts)) {
                return Number(evt.ts);
            }
        }
        return 0;
    };

    if (expId) {
        const ts = searchEvents(era.experiences?.[expId]?.events);
        if (ts) return ts;
    }

    return searchEvents(era.events);
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