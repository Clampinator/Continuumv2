/**
 * STATE: DELETE ACTOR RECORD
 * Removes a history record from the character's database.
 * 
 * @param {Actor} actor - The Foundry Actor instance.
 * @param {string} recordId - The ID of the record to delete.
 */
export async function deleteHistoryRow(actor, recordId) {
    if (!recordId || recordId === 'now') return;

    // 1. Locate the record across the nested structure
    const eras = actor.system.eras || {};
    let deletePath = null;

    for (const [eraId, era] of Object.entries(eras)) {
        if (era.events?.[recordId]) {
            deletePath = `system.eras.${eraId}.events.-=${recordId}`;
            break;
        }

        for (const [expId, exp] of Object.entries(era.experiences || {})) {
            if (exp.events?.[recordId]) {
                deletePath = `system.eras.${eraId}.experiences.${expId}.events.-=${recordId}`;
                break;
            }
        }
        if (deletePath) break;
    }

    if (!deletePath) {
        console.warn(`Continuum | Record ${recordId} not found for deletion.`);
        return;
    }

    // 2. Execute Atomic Deletion
    await actor.update({ [deletePath]: null });
}
