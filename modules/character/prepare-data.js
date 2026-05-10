
import { ITEM_DATA } from '../../item-data.js';
import { getAttributeLabel } from '../attribute-labels.js';
import { BENEFIT_DEFINITIONS } from './benefits/benefit-definitions.js';
import { calculateSpanPool } from '/systems/continuum-v2/modules/temporal-kernel/calculate-span-pool.js';
import { formatSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { SECONDS_IN_YEAR, SECONDS_IN_DAY } from '/systems/continuum-v2/modules/temporal-engine/constants.js';

const ASPECT_LABELS = {
    firearm: { aspect1: 'Handling', aspect2: 'Ammo', aspect3: 'Reliability' },
    technology: { aspect1: 'Speed', aspect2: 'Capacity', aspect3: 'Connectivity' },
    tool: { aspect1: 'Quality', aspect2: 'Versatility', aspect3: 'Durability' },
    vehicle: { aspect1: 'Handling', aspect2: 'Acceleration', aspect3: 'Prestige' }
};

// SPAN POOL: Computed by temporal-kernel/calculate-span-pool.js (pure math).
// AGE: Computed by temporal-translator/age-converter.js (pure formatting).
// No inline date arithmetic or duration formatting in this file.

function _applySpanPoolStats(context) {
    const spanLevel = Number(context.system.spanning?.span) || 0;
    const dobStr = context.system.personal?.dob;
    const genesisTs = dobStr ? parseDateToObjectiveMs(dobStr) : Date.now();

    // Flatten all events from all eras and experiences, sorted by narrative order
    const allEvents = [];
    context.eras.forEach(era => {
        allEvents.push(...(era.events || []));
        era.experiences.forEach(exp => { allEvents.push(...exp.events); });
    });
    allEvents.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

    const poolResult = calculateSpanPool({ spanLevel, events: allEvents, genesisTs });
    context.spanTimeRemaining = poolResult.spanTimeRemainingFormatted;
    context.isOverSpan = poolResult.isOverSpan;

    // Apply per-event stats back onto the event objects for template rendering
    const statsById = new Map(poolResult.eventStats.map(s => [s.eventId, s]));
    for (const event of allEvents) {
        const eventId = event.id || event._id || '';
        const stats = statsById.get(eventId);
        if (stats) {
            event.calculatedSpentFormatted = stats.spentFormatted;
            event.calculatedRemainingFormatted = stats.remainingFormatted;
        }
    }
}

function _calculateArmorSummary(context) {
    const armorSummary = { totalIpA: 0, totalIpB: 0, totalIpC: 0, totalIpD: 0, totalIpE: 0, totalIpF: 0, totalIpG: 0, totalEncumbrance: 0 };
    let armorLoad = 0;
    context.armorItems.forEach(armor => {
        armorSummary.totalIpA += Number(armor.ipA) || 0;
        armorSummary.totalIpB += Number(armor.ipB) || 0;
        armorSummary.totalIpC += Number(armor.ipC) || 0;
        armorSummary.totalIpD += Number(armor.ipD) || 0;
        armorSummary.totalIpE += Number(armor.ipE) || 0;
        armorSummary.totalIpF += Number(armor.ipF) || 0;
        armorSummary.totalIpG += Number(armor.ipG) || 0;
        let enc = parseFloat(armor.encumbrance);
        if (isNaN(enc)) {
            const dbEntry = ITEM_DATA.armor[armor.name] || {};
            enc = parseFloat(dbEntry.encumbrance);
        }
        if (isNaN(enc)) enc = 0;
        armorLoad += enc;
    });
    let weaponWeight = 0;
    context.rangedWeapons.forEach(w => { if (w.carried) weaponWeight += (Number(w.weight) || (ITEM_DATA.rangedWeapons[w.name]?.weight || 0)); });
    context.meleeWeapons.forEach(w => { if (w.carried) weaponWeight += (Number(w.weight) || (ITEM_DATA.meleeWeapons[w.name]?.weight || 0)); });
    const rawGearWeight = context.totalGearWeight || 0;
    armorSummary.totalEncumbrance = Math.floor(armorLoad + rawGearWeight + weaponWeight);
    const bodyValue = Number(foundry.utils.getProperty(context.system, 'attributes.body.value')) || 0;
    armorSummary.quickPenalty = Math.max(0, armorSummary.totalEncumbrance - bodyValue);
    context.armorSummary = armorSummary;
}

export async function prepareCharacterData(sheet, options) {
    const ActorSheetClass = foundry.appv1?.sheets?.ActorSheet ?? ActorSheet;
    const context = await ActorSheetClass.prototype.getData.call(sheet, options);
    
    context.actor = sheet.actor;
    context.system = sheet.actor.system;
    context.isGM = game.user.isGM;
    if (context.isGM) context.editable = true;

    context.toggles = sheet.actor.getFlag('continuum-v2', 'sheetState.toggles') || {};
    context.timelineSortDirection = sheet.actor.getFlag('continuum-v2', 'timelineSortDirection') || 'desc';
    context.playersCanSeeSpan = sheet.actor.getFlag('continuum-v2', 'playersCanSeeSpan') ?? false;
    context.playersCanSeeMetabilities = sheet.actor.getFlag('continuum-v2', 'playersCanSeeMetabilities') ?? false;
    context.playersCanSeeNaturalSpan = sheet.actor.getFlag('continuum-v2', 'playersCanSeeNaturalSpan') ?? false;
    context.showErasSection = sheet.actor.getFlag('continuum-v2', 'showErasSection') ?? false;
    context.showRelationshipsSection = sheet.actor.getFlag('continuum-v2', 'showRelationshipsSection') ?? false;
    context.showGoalsSection = sheet.actor.getFlag('continuum-v2', 'showGoalsSection') ?? false;
    
    context.allVehicleData = ITEM_DATA.allVehicleData;
    context.weaponData = ITEM_DATA.rangedWeapons;
    context.meleeWeaponData = ITEM_DATA.meleeWeapons;
    context.armorData = ITEM_DATA.armor;

    context.fraternityClass = (context.system.personal?.fraternity || "default-fraternity").toLowerCase().replace(/\s+/g, '-');
    const allGear = sheet.actor.items.filter(i => i.type === 'gear').map(item => {
        const plain = item.toObject();
        plain.id = item.id;
        if (!plain.system.aspects) {
            plain.system.aspects = { aspect1: 0, aspect2: 0, aspect3: 0 };
        }
        if (!plain.system.gearType) {
            plain.system.gearType = 'technology';
        }
        const a1 = Number(plain.system.aspects.aspect1) || 0;
        const a2 = Number(plain.system.aspects.aspect2) || 0;
        const a3 = Number(plain.system.aspects.aspect3) || 0;
        if (a1 === 0 && a2 === 0 && a3 === 0 && Number(plain.system.bonus) > 0) {
            plain.system.aspects.aspect3 = Number(plain.system.bonus) || 0;
            plain.computedBonus = Number(plain.system.bonus) || 0;
        } else {
            plain.computedBonus = Math.floor((a1 + a2 + a3) / 3);
        }
        const gt = plain.system.gearType || 'technology';
        plain.aspectLabels = ASPECT_LABELS[gt] || ASPECT_LABELS.technology;
        return plain;
    });
    context.gearItems = allGear;
    context.firearmItems = allGear.filter(i => (i.system?.gearType || 'technology') === 'firearm').map(item => {
        const model = item.system?.firearmModel;
        if (model && ITEM_DATA.rangedWeapons[model]) {
            item.firearmStats = ITEM_DATA.rangedWeapons[model];
        }
        return item;
    });
    context.techItems = allGear.filter(i => (i.system?.gearType || 'technology') === 'technology');
    context.toolItems = allGear.filter(i => (i.system?.gearType || 'technology') === 'tool');
    context.vehicleGearItems = allGear.filter(i => (i.system?.gearType || 'technology') === 'vehicle');
    context.landVehicleGear = allGear.filter(i => i.system?.gearType === 'vehicle' && i.system?.vehicleClass === 'land');
    context.airVehicleGear = allGear.filter(i => i.system?.gearType === 'vehicle' && i.system?.vehicleClass === 'air');
    context.waterVehicleGear = allGear.filter(i => i.system?.gearType === 'vehicle' && i.system?.vehicleClass === 'water');
    context.totalGearWeight = context.gearItems.reduce((total, item) => {
        if (!item.system.carried) return total;
        return total + (Number(item.system.weight) * Number(item.system.quantity) || 0);
    }, 0);

    const spanRank = Number(context.system.spanning?.span) || 0;
    context.spanWeightLimit = [5, 10, 50, 100, 500, 1000][spanRank] || 5;
    context.isLeveller = spanRank === 0;

    const rawEras = context.system.eras || {};
    context.eras = Object.entries(rawEras).map(([id, era]) => {
        const experiences = Object.entries(era.experiences || {}).map(([eid, exp]) => {
            const events = Object.entries(exp.events || {}).map(([evid, ev]) => ({ ...ev, id: evid }));
            if (context.timelineSortDirection === 'desc') {
                events.sort((a, b) => (Number(b.sort) || 0) - (Number(a.sort) || 0));
            } else {
                events.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
            }
            return { ...exp, id: eid, sourceEraId: era.id, events };
        });
        if (context.timelineSortDirection === 'desc') {
            experiences.sort((a, b) => (Number(b.sort) || 0) - (Number(a.sort) || 0));
        } else {
            experiences.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
        }
        const eraEvents = Object.entries(era.events || {}).map(([evid, ev]) => ({ ...ev, id: evid, eraId: id, expId: null }));
        if (context.timelineSortDirection === 'desc') {
            eraEvents.sort((a, b) => (Number(b.sort) || 0) - (Number(a.sort) || 0));
        } else {
            eraEvents.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
        }
        return { ...era, id, experiences, events: eraEvents };
    });

    if (context.timelineSortDirection === 'desc') {
        context.eras.sort((a, b) => (Number(b.sort) || 0) - (Number(a.sort) || 0));
    } else {
        context.eras.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
    }

    // CALCULATED AGE - uses TTL formatSubjectiveAge for consistent output
    const subjectiveNowSecs = Number(context.system.personal?.subjectiveNow) || 0;
    context.calculatedAge = {
        years: Math.floor(subjectiveNowSecs / SECONDS_IN_YEAR),
        days:  Math.floor((subjectiveNowSecs % SECONDS_IN_YEAR) / SECONDS_IN_DAY)
    };

    const allGoals = Object.entries(context.system.goals || {}).map(([id, g]) => ({ id, ...g }));
    allGoals.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    context.goals = allGoals.filter(g => g.importance !== 'Achieved');
    context.resolvedGoals = allGoals.filter(g => g.importance === 'Achieved');
    context.yetItems = Object.entries(context.system.theYet || {}).map(([id, y]) => ({ id, ...y }));
    context.favors = Object.entries(context.system.favors || {}).map(([id, f]) => ({ id, ...f }));
    context.relationships = Object.entries(context.system.relationships || {}).map(([id, r]) => ({ id, ...r }));
    
    context.rangedWeapons = Object.entries(context.system.combat?.rangedWeapons || {}).map(([id, w]) => ({ id, ...w }));
    context.meleeWeapons = Object.entries(context.system.combat?.meleeWeapons || {}).map(([id, w]) => ({ id, ...w }));
    context.armorItems = Object.entries(context.system.combat?.armor || {}).map(([id, a]) => ({ id, ...a }));
    
    _calculateArmorSummary(context);
    context.isSpanOverburdened = context.armorSummary.totalEncumbrance > context.spanWeightLimit;

    context.woundEntries = Object.entries(context.system.combat?.wounds || {}).map(([key, wound]) => ({ key, ...wound }));
    const totalIP = context.woundEntries.reduce((sum, w) => sum + (Number(w.ip) || 0), 0);
    const bodyVal = Number(context.system.attributes?.body?.value) || 0;
    context.woundsSummary = { ipTotal: totalIP, ipRemaining: (bodyVal * 3) - totalIP };

    context.metabilityApplications = Object.entries(context.system.metabilities?.applications || {}).map(([id, app]) => ({ id, ...app }));
    context.spanningAbilities = Object.entries(context.system.spanning?.abilities || {}).map(([id, ability]) => ({ id, ...ability }));
    
    const mapVehicles = (collection, type, key) => Object.entries(collection || {}).map(([id, v]) => ({ id, type, systemKey: key, ...v }));
    context.vehicles = [...mapVehicles(context.system.vehicles, 'vehicle', 'vehicles'), ...mapVehicles(context.system.airVehicles, 'airVehicle', 'airVehicles'), ...mapVehicles(context.system.waterVehicles, 'waterVehicle', 'waterVehicles')];
    
    _applySpanPoolStats(context);

    context.benefitsList = BENEFIT_DEFINITIONS.map(b => ({ ...b, selected: !!(context.system.benefits?.[b.id]) }));

    return context;
}
