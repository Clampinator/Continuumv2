
export async function handleCharacterItemDelete(sheet, event) {
    const button = event.target.closest('.item-delete, .event-delete');
    if (!button) return;

    const { type, id, eraId, expId } = button.dataset;
    const actor = sheet.actor;
    const updates = {};

    switch (type) {
        case 'era':
            updates[`system.eras.-=${id}`] = null;
            break;
        case 'experience':
            updates[`system.eras.${eraId}.experiences.-=${id}`] = null;
            break;
        case 'event':
            const eventPath = expId
                ? `system.eras.${eraId}.experiences.${expId}.events.-=${id}`
                : `system.eras.${eraId}.events.-=${id}`;
            updates[eventPath] = null;
            break;
        case 'goal':
            updates[`system.goals.-=${id}`] = null;
            break;
        case 'favor':
            updates[`system.favors.-=${id}`] = null;
            break;
        case 'relationship':
            updates[`system.relationships.-=${id}`] = null;
            break;
        case 'spanningAbility':
            updates[`system.spanning.abilities.-=${id}`] = null;
            break;
        case 'metabilityApplication':
            updates[`system.metabilities.applications.-=${id}`] = null;
            break;
        case 'yetItem':
            updates[`system.theYet.-=${id}`] = null;
            break;
        case 'rangedWeapon':
            updates[`system.combat.rangedWeapons.-=${id}`] = null;
            break;
        case 'meleeWeapon':
            updates[`system.combat.meleeWeapons.-=${id}`] = null;
            break;
        case 'armor':
            updates[`system.combat.armor.-=${id}`] = null;
            break;
        case 'vehicle':
            updates[`system.vehicles.-=${id}`] = null;
            break;
    }

    if (Object.keys(updates).length > 0) {
        Dialog.confirm({
            eventTitle: "Delete Item",
            content: `<p>Are you sure you want to delete this ${type}?</p>`,
            yes: () => actor.update(updates),
            defaultYes: false
        });
    }
}
