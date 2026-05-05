import Sortable from 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/modular/sortable.esm.js';
import { reindexLifelineNodes } from './modules/lifeline/services/chronology/reindex-lifeline-nodes.js';
import { timestampToDateString } from './modules/temporal-translator/coordinate-converter.js';

/*
Handles the end of a sortable drag operation.
Synchronizes Subjective Sequence (List) with Subjective Age (Graph).
*/
async function _onSortEnd(evt, sheet) {
    const { item: itemEl, to: targetListEl, newIndex } = evt;
    const itemId = itemEl.dataset.itemId;
    const itemLevel = itemEl.dataset.level;

    if (!itemId) return;

    if (itemLevel === 'c') {
        const targetParentId = targetListEl.dataset.parentId;
        const targetEraId = targetListEl.closest('.era-item')?.dataset.itemId;

        // 1. Consult Authority for new Sequence and Physical Address
        const reindex = reindexLifelineNodes(sheet.actor, itemId, newIndex);

        const finalSort = reindex.targetSortValue;
        const finalAge = reindex.targetAge;
        const finalTime = reindex.targetTime;
        const dt = timestampToDateString(finalTime);

        delete reindex.targetSortValue;
        delete reindex.targetAge;
        delete reindex.targetTime;

        // 2. Locate node to move
        const currentData = sheet.actor.toObject(false);
        let eventData = null;
        let sourcePath = null;

        for (const era of Object.values(currentData.system.eras || {})) {
            if (era.events?.[itemId]) {
                eventData = era.events[itemId];
                sourcePath = `system.eras.${era.id}.events.-=${itemId}`;
                break;
            }
            for (const exp of Object.values(era.experiences || {})) {
                if (exp.events?.[itemId]) {
                    eventData = exp.events[itemId];
                    sourcePath = `system.eras.${era.id}.experiences.${exp.id}.events.-=${itemId}`;
                    break;
                }
            }
        }

        if (eventData) {
            // 3. Apply the midpoint coordinate shift
            eventData.sort = finalSort;
            eventData.age = finalAge;

            if (eventData.isSpan) {
                eventData.spanToDate = dt.date;
                eventData.spanToTime = dt.time;
            } else {
                eventData.date = dt.date;
                eventData.time = dt.time;
            }

            const targetPath = targetParentId && targetEraId
                ? `system.eras.${targetEraId}.experiences.${targetParentId}.events.${itemId}`
                : `system.eras.${targetEraId}.events.${itemId}`;

            const finalUpdates = {
                ...reindex,
                [sourcePath]: null,
                [targetPath]: eventData
            };

            await sheet.actor.update(finalUpdates);
        }
    } else {
        sheet.render();
    }
}

export function initializeDragAndDrop(sheet) {
  const html = sheet.element;
  const sortableOptions = {
    animation: 150,
    handle: '.drag-handle',
    onEnd: (evt) => _onSortEnd(evt, sheet)
  };

  html.find('.eras-list').each((i, el) => {
    new Sortable(el, { ...sortableOptions, group: 'eras', draggable: '.era-item' });
  });

  html.find('.experiences-list').each((i, el) => {
    new Sortable(el, { ...sortableOptions, group: 'experiences', draggable: '.experience-item' });
  });

  html.find('.events-container').each((i, el) => {
    new Sortable(el, { ...sortableOptions, group: 'events', draggable: '.event-item' });
  });
}
