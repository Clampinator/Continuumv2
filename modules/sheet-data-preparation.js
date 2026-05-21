import { ITEM_DATA } from '../item-data.js';
import { getEconomicReport } from './org-economics/get-economic-report.js';
import { getAttributeLabel } from './attribute-labels.js';
import { calculateSpanPool } from '/systems/continuum-v2/modules/temporal-kernel/calculate-span-pool.js';
import { parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { SECONDS_IN_YEAR, SECONDS_IN_DAY } from '/systems/continuum-v2/modules/temporal-engine/constants.js';
import { cssClassFromFraternity } from '/systems/continuum-v2/modules/character/css-class-from-fraternity.js';

// SPAN POOL: Computed by temporal-kernel/calculate-span-pool.js (pure math).
// AGE constants sourced from temporal-engine/constants.js.
// No inline date arithmetic or duration formatting in this file.

function _applySpanPoolStats(context) {
    const spanLevel = Number(context.system.spanning?.span) || 0;
    const dobStr = context.system.personal?.dob;
    const genesisTs = dobStr ? parseDateToObjectiveMs(dobStr) : Date.now();

    const allEvents = [];
    context.eras.forEach(era => {
        allEvents.push(...(era.events || []));
        era.experiences.forEach(exp => { allEvents.push(...exp.events); });
    });
    allEvents.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

    const poolResult = calculateSpanPool({ spanLevel, events: allEvents, genesisTs });
    context.spanTimeRemaining = poolResult.spanTimeRemainingFormatted;
    context.isOverSpan = poolResult.isOverSpan;

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

export async function prepareSheetData(sheet, options) {
    const context = {
        actor: sheet.actor,
        system: sheet.actor.system,
        isGM: game.user.isGM,
        toggles: sheet.actor.getFlag('continuum-v2', 'sheetState.toggles') || {},
        timelineSortDirection: sheet.actor.getFlag('continuum-v2', 'timelineSortDirection') || 'desc',
        playersCanSeeSpan: sheet.actor.getFlag('continuum-v2', 'playersCanSeeSpan') ?? false,
        playersCanSeeMetabilities: sheet.actor.getFlag('continuum-v2', 'playersCanSeeMetabilities') ?? false,
        playersCanSeeNaturalSpan: sheet.actor.getFlag('continuum-v2', 'playersCanSeeNaturalSpan') ?? false,
        allVehicleData: ITEM_DATA.allVehicleData,
        weaponData: ITEM_DATA.rangedWeapons,
        meleeWeaponData: ITEM_DATA.meleeWeapons,
        armorData: ITEM_DATA.armor
    };
    context.fraternityClass = cssClassFromFraternity(context.system.personal?.fraternity);
    context.gearItems = sheet.actor.items.filter(i => i.type === 'gear').map(item => {
        const plain = item.toObject();
        plain.id = item.id;
        plain.attributeLabel = getAttributeLabel(item.system.attributeType);
        return plain;
    });
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
            events.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
            return { ...exp, id: eid, sourceEraId: era.id, events };
        });
        experiences.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
        const eraEvents = Object.entries(era.events || {}).map(([evid, ev]) => ({ ...ev, id: evid, eraId: id, expId: null }));
        eraEvents.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
        return { ...era, id, experiences, events: eraEvents };
    });
    if (context.timelineSortDirection === 'desc') context.eras.sort((a, b) => (Number(b.sort) || 0) - (Number(a.sort) || 0));
    else context.eras.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
    // CALCULATED AGE - uses constants from temporal-engine/constants.js
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
    const mapVehicles = (collection, type, key) => Object.entries(collection || {}).map(([id, v]) => ({ id, type, systemKey: key, ...v }));
    context.vehicles = [...mapVehicles(context.system.vehicles, 'vehicle', 'vehicles'), ...mapVehicles(context.system.airVehicles, 'airVehicle', 'airVehicles'), ...mapVehicles(context.system.waterVehicles, 'waterVehicle', 'waterVehicles')];
    _applySpanPoolStats(context);
    return context;
}

export async function prepareOrganizationData(sheet, options) {
    const context = await prepareSheetData(sheet, options);
    context.isOrganization = true;
    context.mandates = Object.entries(context.system.mandates || {}).map(([id, m]) => ({ id, ...m }));
    
    // FISCAL PASS: Generate Economic Report directly from database keys (type, size, budget)
    context.fiscal = getEconomicReport(sheet.actor);

    const rawPhases = context.system.phases || {};
    context.phases = Object.entries(rawPhases).map(([id, phase]) => {
        const operations = Object.entries(phase.operations || {}).map(([oid, op]) => {
            const engagements = Object.entries(op.engagements || {}).map(([eid, e]) => ({ id: eid, ...e }));
            return { id: oid, ...op, engagements };
        });
        const events = Object.entries(phase.events || {}).map(([eid, e]) => ({ id: eid, ...e }));
        return { id, ...phase, operations, events };
    });
    return context;
}
