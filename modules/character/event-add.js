
import { reindexLifelineNodes } from '../lifeline/services/chronology/reindex-lifeline-nodes.js';

export async function handleCharacterEventAdd(sheet, event) {
    const button = event.target.closest('.event-add');
    if (!button) return;
    
    const { eraId, expId } = button.dataset;
    const newId = foundry.utils.randomID();

    const reindex = reindexLifelineNodes(sheet.actor, newId, -1);
    const sort = reindex.targetSortValue;
    delete reindex.targetSortValue;

    const path = expId
        ? `system.eras.${eraId}.experiences.${expId}.events.${newId}`
        : `system.eras.${eraId}.events.${newId}`;

    const update = {
        ...reindex,
        [path]: {
            id: newId,
            title: "New Event",
            date: sheet.actor.system.eras[eraId]?.dateFrom || "",
            time: "12:00",
            sort: sort
        }
    };

    await sheet.actor.update(update);
}
