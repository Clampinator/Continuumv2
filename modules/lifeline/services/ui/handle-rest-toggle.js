import { reindexLifelineNodes } from '../chronology/reindex-lifeline-nodes.js';
import { ReferenceResolver } from '../reference-resolver.js';

export async function createEndOfRestEvent(actor, sourceEvent, eraId, expId) {
    if (!sourceEvent || !sourceEvent.date) return;

    // 1. Calculate the end time (24 hours later)
    const startTimeStr = `${sourceEvent.date}T${sourceEvent.time || '00:00'}`;
    const startDate = new Date(startTimeStr);
    if (isNaN(startDate.getTime())) return;

    const endDate = new Date(startDate.getTime() + (24 * 60 * 60 * 1000)); 
    const formatZeroPad = (num) => String(num).padStart(2, '0');
    const endDateStr = `${endDate.getFullYear()}-${formatZeroPad(endDate.getMonth() + 1)}-${formatZeroPad(endDate.getDate())}`;
    const endTimeStr = `${formatZeroPad(endDate.getHours())}:${formatZeroPad(endDate.getMinutes())}`;

    // 2. Calculate the correct Subjective Age for the end of rest
    // Since Rest is a 1:1 progression, the age increases by exactly the same amount as objective time.
    const endAge = (Number(sourceEvent.age) || 0) + (24 * 60 * 60);

    // 3. Prepare the new event ID
    const newId = foundry.utils.randomID();
    
    // 4. Use Reindex to get the correct Sort for the new event
    const reindex = reindexLifelineNodes(actor, newId, -1, { 
        age: endAge,
        time: endDate.getTime(),
        eventIsSpan: false 
    });

    const newEventData = {
        id: newId,
        eventTitle: "End of Rest",
        eventNotes: "Automatic rest completion.",
        date: endDateStr,
        time: endTimeStr,
        age: endAge, // Canonical age calculated above
        sort: reindex.targetSortValue, // Canonical sort from reindex
        eventIsSpan: false,
        eventIsRest: false,
        isRestEnd: true
    };
    
    console.log("Continuum | Creating End of Rest Event:", newEventData);
    
    // 5. Construct the update path
    const updatePath = expId
        ? `system.eras.${eraId}.experiences.${expId}.events.${newId}`
        : `system.eras.${eraId}.events.${newId}`;

    // 6. Apply updates (including any reindex shifts)
    const updates = {
        ...reindex,
        [updatePath]: newEventData,
        'system.personal.subjectiveNow': endAge
    };
    delete updates.targetAge;
    delete updates.targetSortValue;

    await actor.update(updates);
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
