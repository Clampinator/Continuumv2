import { ITEM_DATA } from '../item-data.js';
import { getEconomicReport } from './org-economics/get-economic-report.js';
import { getAttributeLabel } from './attribute-labels.js';
import { calculateSpanPool } from '/systems/continuum-v2/modules/temporal-kernel/calculate-span-pool.js';
import { parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { SECONDS_IN_YEAR, SECONDS_IN_DAY } from '/systems/continuum-v2/modules/temporal-engine/constants.js';
import { cssClassFromFraternity } from '/systems/continuum-v2/modules/character/css-class-from-fraternity.js';
import { calculateArmorIpTotals } from '/systems/continuum-v2/modules/temporal-kernel/calculate-armor-ip-totals.js';
import { calculateTotalEncumbrance } from '/systems/continuum-v2/modules/temporal-kernel/calculate-total-encumbrance.js';
import { calculateGearWeight } from '/systems/continuum-v2/modules/temporal-kernel/calculate-gear-weight.js';
import { calculateWoundCapacity } from '/systems/continuum-v2/modules/temporal-kernel/calculate-wound-capacity.js';
import { getSpanWeightLimit } from '/systems/continuum-v2/modules/temporal-kernel/get-span-weight-limit.js';
import { isLeveller } from '/systems/continuum-v2/modules/temporal-kernel/is-leveller.js';
import { isSpanOverburdened } from '/systems/continuum-v2/modules/temporal-kernel/is-span-overburdened.js';
import { calculateQuickPenalty } from '/systems/continuum-v2/modules/temporal-kernel/calculate-quick-penalty.js';
import { computeSpanPoolDisplay, applyEventStatsToTemplate } from '/systems/continuum-v2/modules/temporal-engine/compute-span-pool-display.js';

// SPAN POOL: Computed by temporal-kernel/calculate-span-pool.js (pure math).
// AGE constants sourced from temporal-engine/constants.js.
// No inline date arithmetic or duration formatting in this file.

function _calculateArmorSummary(context) {
    const ipTotals = calculateArmorIpTotals(context.armorItems);
    const totalEncumbrance = calculateTotalEncumbrance(
        context.armorItems, context.rangedWeapons, context.meleeWeapons,
        context.totalGearWeight || 0, ITEM_DATA.armor, ITEM_DATA.rangedWeapons, ITEM_DATA.meleeWeapons
    );
    const forceValue = Number(foundry.utils.getProperty(context.system, 'attributes.force.value') || foundry.utils.getProperty(context.system, 'attributes.body.value')) || 0;
    context.armorSummary = {
        ...ipTotals,
        totalEncumbrance,
        quickPenalty: calculateQuickPenalty(totalEncumbrance, forceValue)
    };
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
    context.totalGearWeight = calculateGearWeight(context.gearItems);
    const spanRank = Number(context.system.spanning?.span) || 0;
    context.spanWeightLimit = getSpanWeightLimit(spanRank);
    context.isLeveller = isLeveller(spanRank);
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
    context.isSpanOverburdened = isSpanOverburdened(context.armorSummary.totalEncumbrance, context.spanWeightLimit);
    context.woundEntries = Object.entries(context.system.combat?.wounds || {}).map(([key, wound]) => ({ key, ...wound }));
    const forceVal = Number(context.system.attributes?.force?.value || context.system.attributes?.body?.value) || 0;
    context.woundsSummary = calculateWoundCapacity(forceVal, context.woundEntries);
    context.metabilityApplications = Object.entries(context.system.metabilities?.applications || {}).map(([id, app]) => ({ id, ...app }));
    const mapVehicles = (collection, type, key) => Object.entries(collection || {}).map(([id, v]) => ({ id, type, systemKey: key, ...v }));
    context.vehicles = [...mapVehicles(context.system.vehicles, 'vehicle', 'vehicles'), ...mapVehicles(context.system.airVehicles, 'airVehicle', 'airVehicles'), ...mapVehicles(context.system.waterVehicles, 'waterVehicle', 'waterVehicles')];
    const poolDisplay = computeSpanPoolDisplay(context, parseDateToObjectiveMs, calculateSpanPool);
    context.spanTimeRemaining = poolDisplay.spanTimeRemainingFormatted;
    context.isOverSpan = poolDisplay.isOverSpan;
    applyEventStatsToTemplate(poolDisplay.allEvents, poolDisplay.eventStatsById);
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
