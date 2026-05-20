
export async function handleOrgEventAdd(sheet, event) {
    const button = event.target.closest('.event-add');
    if (!button) return;
    
    const { ageId: phaseId, expId: opId } = button.dataset;
    const newId = foundry.utils.randomID();

    const path = `system.phases.${phaseId}.operations.${opId}.engagements.${newId}`;
        
    const update = {
        [path]: {
            id: newId,
            name: "New Engagement",
            date: sheet.actor.system.phases[phaseId]?.dateFrom || "",
            time: "12:00",
            description: ""
        }
    };

    await sheet.actor.update(update);
}
