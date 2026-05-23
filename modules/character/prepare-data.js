
import { ITEM_DATA } from '../../item-data.js';
import { getAttributeLabel } from '../attribute-labels.js';
import { BENEFIT_DEFINITIONS } from './benefits/benefit-definitions.js';
import { calculateSpanPool } from '/systems/continuum-v2/modules/temporal-kernel/calculate-span-pool.js';
import { parseDateToObjectiveMs } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { SECONDS_IN_YEAR, SECONDS_IN_DAY } from '/systems/continuum-v2/modules/temporal-engine/constants.js';
import { GEAR_ASPECT_LABELS } from '/systems/continuum-v2/modules/temporal-kernel/gear-aspect-labels.js';
import { cssClassFromFraternity } from '/systems/continuum-v2/modules/character/css-class-from-fraternity.js';
import { calculateArmorIpTotals } from '/systems/continuum-v2/modules/temporal-kernel/calculate-armor-ip-totals.js';
import { calculateTotalEncumbrance } from '/systems/continuum-v2/modules/temporal-kernel/calculate-total-encumbrance.js';
import { calculateGearWeight } from '/systems/continuum-v2/modules/temporal-kernel/calculate-gear-weight.js';
import { calculateWoundCapacity } from '/systems/continuum-v2/modules/temporal-kernel/calculate-wound-capacity.js';
import { calculateGearBonus } from '/systems/continuum-v2/modules/temporal-kernel/calculate-gear-bonus.js';
import { getSpanWeightLimit } from '/systems/continuum-v2/modules/temporal-kernel/get-span-weight-limit.js';
import { isLeveller } from '/systems/continuum-v2/modules/temporal-kernel/is-leveller.js';
import { isSpanOverburdened } from '/systems/continuum-v2/modules/temporal-kernel/is-span-overburdened.js';
import { calculateQuickPenalty } from '/systems/continuum-v2/modules/temporal-kernel/calculate-quick-penalty.js';
import { computeSpanPoolDisplay, applyEventStatsToTemplate } from '/systems/continuum-v2/modules/temporal-engine/compute-span-pool-display.js';

// SPAN POOL: Computed by temporal-kernel/calculate-span-pool.js (pure math).
// AGE: Computed by temporal-translator/age-converter.js (pure formatting).
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

    context.fraternityClass = cssClassFromFraternity(context.system.personal?.fraternity);
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
        plain.computedBonus = calculateGearBonus(a1, a2, a3, plain.system.bonus);
        const gt = plain.system.gearType || 'technology';
        plain.aspectLabels = GEAR_ASPECT_LABELS[gt] || GEAR_ASPECT_LABELS.technology;
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
    context.totalGearWeight = calculateGearWeight(context.gearItems);

    const spanRank = Number(context.system.spanning?.span) || 0;
    context.spanWeightLimit = getSpanWeightLimit(spanRank);
    context.isLeveller = isLeveller(spanRank);

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

    // CALCULATED AGE - prefer the viewport's computed NOW node age
    // (which accounts for span displacement) over the stale DB value.
    // Falls back to subjectiveNow on first render before viewport exists.
    const nowAge = sheet._spanGraphViewport?.latestState?.nowNode?.x;
    const subjectiveNowSecs = (nowAge != null)
        ? Number(nowAge)
        : (Number(context.system.personal?.subjectiveNow) || 0);
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
    context.spanningAbilities = Object.entries(context.system.spanning?.abilities || {}).map(([id, ability]) => ({ id, ...ability }));
    context.natSpanAbilities = Object.entries(context.system.spanning?.natSpanAbilities || {}).map(([id, ability]) => ({ id, ...ability }));
    
    const mapVehicles = (collection, type, key) => Object.entries(collection || {}).map(([id, v]) => ({ id, type, systemKey: key, ...v }));
    context.vehicles = [...mapVehicles(context.system.vehicles, 'vehicle', 'vehicles'), ...mapVehicles(context.system.airVehicles, 'airVehicle', 'airVehicles'), ...mapVehicles(context.system.waterVehicles, 'waterVehicle', 'waterVehicles')];
    
    const poolDisplay = computeSpanPoolDisplay(context, parseDateToObjectiveMs, calculateSpanPool);
    context.spanTimeRemaining = poolDisplay.spanTimeRemainingFormatted;
    context.isOverSpan = poolDisplay.isOverSpan;
    applyEventStatsToTemplate(poolDisplay.allEvents, poolDisplay.eventStatsById);

    context.benefitsList = BENEFIT_DEFINITIONS.map(b => ({ ...b, selected: !!(context.system.benefits?.[b.id]) }));

    return context;
}
