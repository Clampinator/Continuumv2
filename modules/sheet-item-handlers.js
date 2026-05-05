
import { ITEM_DATA } from '../item-data.js';
import { reindexLifelineNodes } from './lifeline/services/chronology/reindex-lifeline-nodes.js';
import { normalizeDateInput } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';

/*
Handles the "Add" button clicks for all repeating sections on the actor sheet.
*/
export async function handleItemAdd(sheet, event) {
    const button = event.target.closest('.item-add');
    if (!button) return;

    const dataType = button.dataset.type;
    const actor = sheet.actor;
    const newId = foundry.utils.randomID();
    let updates = {};

    switch (dataType) {
        case 'era': {
            const existingEras = actor.system.eras || {};
            const isFirst = Object.keys(existingEras).length === 0;
            const dobStr = normalizeDateInput(actor.system.personal?.dob || '');
            updates[`system.eras.${newId}`] = {
                id: newId,
                name: "New Era",
                age: 0,
                dateFrom: dobStr,
                dateTo: '',
                sort: Date.now(),
                experiences: {},
                events: {}
            };
            break;
        }

        case 'experience':
            const eraId = button.dataset.eraId;
            if (!eraId) return;
            updates[`system.eras.${eraId}.experiences.${newId}`] = {
                id: newId,
                name: "New Experience",
                sort: Date.now(),
                events: {}
            };
            break;

        case 'event':
            const targetEraId = button.dataset.eraId;
            const reindex = reindexLifelineNodes(actor, newId, -1); // Append to end
            updates = {
                ...reindex,
                [`system.eras.${targetEraId}.events.${newId}`]: {
                    id: newId,
                    eventTitle: "New Event",
                    eventNotes: "",
                    date: actor.system.eras[targetEraId]?.dateFrom || "",
                    time: "12:00",
                    sort: reindex.targetSortValue
                }
            };
            delete updates.targetSortValue;
            break;

        case 'vehicle':
            updates[`system.vehicles.${newId}`] = {
                id: newId,
                name: "none",
                speedBlocks: 0,
                mass: 0,
                ip: 0,
                armor: 0,
                passengers: 0
            };
            break;

        case 'airVehicle':
            updates[`system.airVehicles.${newId}`] = {
                id: newId,
                name: "none",
                speedBlocks: 0,
                mass: 0,
                ip: 0,
                armor: 0,
                passengers: 0
            };
            break;

        case 'waterVehicle':
            updates[`system.waterVehicles.${newId}`] = {
                id: newId,
                name: "none",
                speedBlocks: 0,
                mass: 0,
                ip: 0,
                armor: 0,
                passengers: 0
            };
            break;

        case 'rangedWeapon':
            updates[`system.combat.rangedWeapons.${newId}`] = {
                id: newId,
                name: "none",
                carried: true
            };
            break;

        case 'meleeWeapon':
            updates[`system.combat.meleeWeapons.${newId}`] = {
                id: newId,
                name: "none",
                carried: true
            };
            break;

        case 'armor':
            updates[`system.combat.armor.${newId}`] = {
                id: newId,
                name: "none"
            };
            break;

        case 'goal':
            updates[`system.goals.${newId}`] = {
                id: newId,
                description: "",
                importance: "Passing",
                condition: "",
                createdAt: Date.now()
            };
            break;

        case 'favor':
            updates[`system.favors.${newId}`] = {
                id: newId,
                description: "",
                importance: "Unimportant",
                when: "",
                createdAt: Date.now()
            };
            break;

        case 'relationship':
            updates[`system.relationships.${newId}`] = {
                id: newId,
                name: "",
                relationshipType: "Acquaintance",
                importance: "Social",
                when: "",
                where: ""
            };
            break;

        case 'spanningAbility':
            updates[`system.spanning.abilities.${newId}`] = {
                id: newId,
                name: "",
                description: ""
            };
            break;

        case 'metabilityApplication':
            updates[`system.metabilities.applications.${newId}`] = {
                id: newId,
                name: "",
                description: "",
                level: 1,
                running: false,
                coercion: 0,
                creativity: 0,
                farsense: 0,
                pk: 0,
                redaction: 0
            };
            break;

        case 'yetItem':
            updates[`system.theYet.${newId}`] = {
                id: newId,
                description: "",
                done: false,
                frag: 0,
                date: "",
                time: ""
            };
            break;

        default:
            console.warn(`Continuum | handleItemAdd: Unknown dataType '${dataType}'`);
            return;
    }

    if (Object.keys(updates).length > 0) {
        await actor.update(updates);
    }
}

/*
Specialized handler for adding events inside an experience context.
*/
export async function handleEventAdd(sheet, event) {
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
            eventTitle: "New Event",
            date: sheet.actor.system.eras[eraId]?.dateFrom || "",
            time: "12:00",
            sort: sort
        }
    };

    await sheet.actor.update(update);
}

/*
Utility to find the current highest sort value in a collection.
*/
export function getMaxSortValue(collection) {
    if (!collection) return 0;
    let max = 0;
    for (const item of Object.values(collection)) {
        const s = Number(item.sort) || 0;
        if (s > max) max = s;
    }
    return max;
}

/*
Handles the "Delete" button clicks for all repeating sections.
*/
export async function handleItemDelete(sheet, event) {
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
            // CASCADING DELETION LOGIC
            const era = actor.system.eras[eraId];
            const eventData = expId ? era?.experiences[expId]?.events[id] : era?.events[id];

            // If this node started an experience, delete that experience too
            const genesisExpId = eventData?.startsExpId;

            const eventPath = expId
                ? `system.eras.${eraId}.experiences.${expId}.events.-=${id}`
                : `system.eras.${eraId}.events.-=${id}`;

            updates[eventPath] = null;

            if (genesisExpId) {
                updates[`system.eras.${eraId}.experiences.-=${genesisExpId}`] = null;
            }
            break;
        case 'vehicle':
            updates[`system.vehicles.-=${id}`] = null;
            break;
        case 'airVehicle':
            updates[`system.airVehicles.-=${id}`] = null;
            break;
        case 'waterVehicle':
            updates[`system.waterVehicles.-=${id}`] = null;
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
    }

    if (Object.keys(updates).length > 0) {
        await actor.update(updates);
    }
}
