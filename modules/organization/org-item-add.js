
export async function handleOrgItemAdd(sheet, event) {
    const button = event.target.closest('.item-add');
    if (!button) return;
    
    const dataType = button.dataset.type;
    const actor = sheet.actor;
    const newId = foundry.utils.randomID();
    let updates = {};

    switch (dataType) {
        case 'mandate':
            updates[`system.mandates.${newId}`] = { description: "", importance: "", condition: "", createdAt: Date.now() };
            break;
        case 'phase':
            updates[`system.phases.${newId}`] = { name: "New Phase", dateFrom: "", dateTo: "", operations: {}, sort: Date.now() };
            break;
        case 'orgOperation':
            const phaseId = button.dataset.phaseId;
            if (phaseId) updates[`system.phases.${phaseId}.operations.${newId}`] = { id: newId, name: "New Operation", dateFrom: "", dateTo: "", engagements: {} };
            break;
        case 'engagement':
            const pId = button.dataset.phaseId;
            const oId = button.dataset.opId;
            if (pId && oId) updates[`system.phases.${pId}.operations.${oId}.engagements.${newId}`] = { id: newId, name: "New Engagement", date: "", time: "12:00", description: "" };
            break;
        case 'orgConflictPhysical':
            updates[`system.conflict.physical.${newId}`] = { description: "", size: "", cohesion: 0, effectiveness: 0, training: 0, experience: 0 };
            break;
        case 'orgConflictEspionage':
            updates[`system.conflict.espionage.${newId}`] = { description: "", size: "", integrity: 0, appeal: 0, training: 0, experience: 0 };
            break;
        case 'orgConflictOnline':
            updates[`system.conflict.online.${newId}`] = { description: "", type: "", l33t: 0, grok: 0, pwn: 0, phreak: 0 };
            break;
        case 'orgConflictPsyops':
            updates[`system.conflict.psyops.${newId}`] = { description: "", role: "", shade: "grey", ruthlessness: 0, resources: 0, sympathizers: 0 };
            break;
        case 'psyopCampaign':
            updates[`system.conflict.psyopCampaigns.${newId}`] = {
                id: newId, name: 'New Campaign', target: '',
                phases: {
                    Planning: false, Development: false, Testing: false,
                    Media: false, Fieldwork: false, 'Post Test': false, Analysis: false,
                },
            };
            break;
        case 'orgFavor':
            updates[`system.balanceSheet.${newId}`] = { description: "", done: false, importance: "", when: "" };
            break;
    }

    if (Object.keys(updates).length > 0) await actor.update(updates);
}
