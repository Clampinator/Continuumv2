
import { reindexLifelineNodes } from '../lifeline/services/chronology/reindex-lifeline-nodes.js';
import { normalizeDateInput } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';

export async function handleCharacterItemAdd(sheet, event) {
    const button = event.target.closest('.item-add');
    if (!button) return;
    
    const dataType = button.dataset.type;
    const actor = sheet.actor;
    const newId = foundry.utils.randomID();
    let updates = {};

    switch (dataType) {
        case 'era': {
            const existingEras = actor.system.eras || {};
            const dobStr = normalizeDateInput(actor.system.personal?.dob || '');
            updates[`system.eras.${newId}`] = { id: newId, name: "New Era", age: 0, dateFrom: dobStr, dateTo: '', sort: Date.now(), experiences: {}, events: {} };
            break;
        }
        case 'experience':
            const eraId = button.dataset.eraId;
            if (eraId) updates[`system.eras.${eraId}.experiences.${newId}`] = { id: newId, name: "New Experience", sort: Date.now(), events: {} };
            break;
        case 'event':
            const targetEraId = button.dataset.eraId;
            const reindex = reindexLifelineNodes(actor, newId, -1);
            updates = { ...reindex, [`system.eras.${targetEraId}.events.${newId}`]: { id: newId, eventTitle: "New Event", date: actor.system.eras[targetEraId]?.dateFrom || "", time: "12:00", sort: reindex.targetSortValue } };
            delete updates.targetSortValue;
            break;
        case 'goal':
            updates[`system.goals.${newId}`] = { id: newId, description: "", importance: "Passing", condition: "", createdAt: Date.now() };
            break;
        case 'favor':
            updates[`system.favors.${newId}`] = { id: newId, description: "", importance: "Unimportant", when: "", createdAt: Date.now() };
            break;
        case 'relationship':
            updates[`system.relationships.${newId}`] = { id: newId, name: "", relationshipType: "Acquaintance", importance: "Social", when: "", where: "" };
            break;
        case 'spanningAbility':
            updates[`system.spanning.abilities.${newId}`] = { id: newId, name: "", description: "", value: 0 };
            break;
        case 'natSpanAbility':
            updates[`system.spanning.natSpanAbilities.${newId}`] = { id: newId, name: "", description: "", value: 0 };
            break;
        case 'metabilityApplication':
            updates[`system.metabilities.applications.${newId}`] = { id: newId, name: "", description: "" };
            break;
        case 'yetItem':
            updates[`system.theYet.${newId}`] = { id: newId, description: "", done: false, frag: 0, date: "", time: "" };
            break;
        case 'rangedWeapon':
            updates[`system.combat.rangedWeapons.${newId}`] = { id: newId, name: "none", carried: true };
            break;
        case 'meleeWeapon':
            updates[`system.combat.meleeWeapons.${newId}`] = { id: newId, name: "none", carried: true };
            break;
        case 'armor':
            updates[`system.combat.armor.${newId}`] = { id: newId, name: "none" };
            break;
        case 'vehicle':
            updates[`system.vehicles.${newId}`] = { id: newId, name: "none", mass: 0, ip: 0, armor: 0, passengers: 0 };
            break;
    }

    if (Object.keys(updates).length > 0) await actor.update(updates);
}
