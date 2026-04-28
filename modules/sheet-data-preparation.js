import { ITEM_DATA } from '../item-data.js';
import { getEconomicReport } from './org-economics/get-economic-report.js';
import { getAttributeLabel } from './attribute-labels.js';

function _formatSecondsToDuration(totalSeconds) {
    if (isNaN(totalSeconds)) totalSeconds = 0;
    const isNegative = totalSeconds < 0;
    totalSeconds = Math.abs(totalSeconds);
    const sign = isNegative ? "-" : "";
    const years = Math.floor(totalSeconds / 31536000);
    let remainder = totalSeconds % 31536000;
    const days = Math.floor(remainder / 86400);
    remainder %= 86400;
    const hours = Math.floor(remainder / 3600);
    remainder %= 3600;
    const minutes = Math.floor(remainder / 60);
    const seconds = remainder % 60;
    return `${sign}${years}y ${days}d ${hours}h ${minutes}m ${seconds}s`.replace(/0[ydhms]\s?/g, '').trim() || "0s";
}

function _calculateLifelineStats(context) {
    const SPAN_POOL_MAP = { 0: 0, 1: 31536000, 2: 315360000, 3: 3153600000, 4: 31536000000, 5: 315360000000 };
    const spanLevel = Number(context.system.spanning?.span) || 0;
    const maxSpanPool = SPAN_POOL_MAP[spanLevel] || 0;
    const dobStr = context.system.personal?.dob;
    const genesisTime = dobStr ? new Date(dobStr + "T12:00:00").getTime() : Date.now();
    const allEvents = [];
    context.eras.forEach(era => {
        allEvents.push(...(era.events || []));
        era.experiences.forEach(exp => { allEvents.push(...exp.events); });
    });
    allEvents.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
    let currentSpanSpentInCycle = 0;
    let lastObjectiveTime = genesisTime;
    for (const event of allEvents) {
        if (event.eventIsRest) currentSpanSpentInCycle = 0;
        const arrivalDate = event.eventIsSpan ? event.eventSpanToDate : event.eventDate;
        const arrivalTime = event.eventIsSpan ? event.eventSpanToTime : event.eventTime;
        if (!arrivalDate) continue;
        const arrivalTs = new Date(`${arrivalDate}T${arrivalTime || '12:00:00'}`).getTime();
        if (isNaN(arrivalTs)) continue;
        const objectiveDeltaSeconds = Math.abs(arrivalTs - lastObjectiveTime) / 1000;
        if (event.eventIsSpan) {
            currentSpanSpentInCycle += objectiveDeltaSeconds;
            event.calculatedSpentFormatted = _formatSecondsToDuration(objectiveDeltaSeconds);
        } else {
            event.calculatedSpentFormatted = "0s (Leveling)";
        }
        event.calculatedRemainingFormatted = _formatSecondsToDuration(maxSpanPool - currentSpanSpentInCycle);
        lastObjectiveTime = arrivalTs;
    }
    context.spanTimeRemaining = _formatSecondsToDuration(maxSpanPool - currentSpanSpentInCycle);
    context.isOverSpan = (maxSpanPool - currentSpanSpentInCycle) < 0;
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
        const itemMaxIp = Math.max(Number(armor.ipA) || 0, Number(armor.ipB) || 0, Number(armor.ipC) || 0, Number(armor.ipD) || 0, Number(armor.ipE) || 0, Number(armor.ipF) || 0, Number(armor.ipG) || 0);
        let multiplier = parseFloat(armor.encumbrance);
        if (isNaN(multiplier)) {
            const dbEntry = ITEM_DATA.armor[armor.name] || {};
            multiplier = parseFloat(dbEntry.encumbrance);
        }
        if (isNaN(multiplier)) multiplier = 1.0;
        armorLoad += (itemMaxIp * multiplier);
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
    context.fraternityClass = (context.system.personal?.fraternity || "default-fraternity").toLowerCase();
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
    // --- CALCULATED AGE (from Lifeline Now node) ---
    const subjectiveNowSecs = Number(context.system.personal?.subjectiveNow) || 0;
    context.calculatedAge = {
        years: Math.floor(subjectiveNowSecs / 31536000),
        days:  Math.floor((subjectiveNowSecs % 31536000) / 86400)
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
    _calculateLifelineStats(context);
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
