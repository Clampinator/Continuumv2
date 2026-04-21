
export async function handleOrgItemDelete(sheet, event) {
    const button = event.target.closest('.item-delete');
    if (!button) return;

    const { type, id, phaseId, opId } = button.dataset;
    const actor = sheet.actor;
    const updates = {};

    switch (type) {
        case 'mandate':
            updates[`system.mandates.-=${id}`] = null;
            break;
        case 'phase':
            updates[`system.phases.-=${id}`] = null;
            break;
        case 'orgOperation':
            updates[`system.phases.${phaseId}.operations.-=${id}`] = null;
            break;
        case 'engagement':
            updates[`system.phases.${phaseId}.operations.${opId}.engagements.-=${id}`] = null;
            break;
        case 'orgConflictPhysical':
            updates[`system.conflict.physical.-=${id}`] = null;
            break;
        case 'orgConflictEspionage':
            updates[`system.conflict.espionage.-=${id}`] = null;
            break;
        case 'orgConflictOnline':
            updates[`system.conflict.online.-=${id}`] = null;
            break;
        case 'orgConflictPsyops':
            updates[`system.conflict.psyops.-=${id}`] = null;
            break;
        case 'psyopCampaign':
            updates[`system.conflict.psyopCampaigns.-=${id}`] = null;
            break;
        case 'orgFavor':
            updates[`system.balanceSheet.-=${id}`] = null;
            break;
    }

    if (Object.keys(updates).length > 0) {
        Dialog.confirm({
            title: "Delete Organizational Unit",
            content: `<p>Are you sure you want to delete this ${type}?</p>`,
            yes: () => actor.update(updates),
            defaultYes: false
        });
    }
}
