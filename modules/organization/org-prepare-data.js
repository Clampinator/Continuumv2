
import { ITEM_DATA } from '../../item-data.js';
import { getEconomicReport } from './org-economics/get-economic-report.js';
import { ONLINE_ALLEGIANCE_REGISTRY } from './org-economics/economic-registry.js';

/**
 * Prepares data specifically for organization actors.
 * Isolated from character domain logic.
 * @param {ActorSheet} sheet - The organization sheet instance.
 * @param {object} context - The existing context object from super.getData().
 */
export async function prepareOrganizationData(sheet, context) {
    // Ensure core references are available in the context
    context.actor = sheet.actor;
    context.system = sheet.actor.system;
    context.isGM = game.user.isGM;
    context.isOrganization = true;
    if (context.isGM) context.editable = true;

    context.toggles = sheet.actor.getFlag('continuum-v2', 'sheetState.toggles') || {};

    // FISCAL PASS: Generate Economic Report
    context.fiscal = getEconomicReport(sheet.actor);

    // Inject derived attribute values into context.system so existing template
    // references (spinners, roll handlers) pick them up without further changes.
    // These are display-only — the form hidden inputs carry no `name` attribute
    // for the four derived attrs, so they are never written back from user input.
    context.system.attributes.force.value     = context.fiscal.derived.force;
    context.system.attributes.intel.value     = context.fiscal.derived.intel;
    context.system.attributes.influence.value = context.fiscal.derived.influence;
    context.system.attributes.comms.value     = context.fiscal.derived.comms;

    // Enrich conflict units with cost and cap data for the template.
    // This creates context.conflictUnits[type] = array of {id, ...unit, _cost, _aspects}
    // so the template can show per-unit MP/RP spend and per-aspect caps without helpers.
    const orgType   = context.system.structure?.type || 'Social';
    const orgSize   = Number(context.system.structure?.size) || 1;
    const budget    = Number(context.system.structure?.budget) || 1;
    const irVal     = Number(context.system.attributes?.internalReputation?.perm) || 0;

    // Expose orgSize at root context so templates can access it without path traversal.
    context.orgSize = orgSize;

    context.conflictUnits = {};
    for (const unitType of ['physical', 'espionage', 'online', 'psyops']) {
        context.conflictUnits[unitType] = Object.entries(context.system.conflict?.[unitType] || {}).map(([id, unit]) => {
            const report = context.fiscal.unitReports[unitType]?.[id] || { mp: 0, rp: 0, aspects: {} };
            const enrichedAspects = {};
            for (const [aspect, data] of Object.entries(report.aspects || {})) {
                enrichedAspects[aspect] = { ...data, overCap: (data.raw > data.cap) };
            }
            return { id, ...unit, _cost: { mp: report.mp, rp: report.rp }, _aspects: enrichedAspects };
        });
    }

    // Expose unit meta (count vs hard cap) for template header displays and add-button gating.
    context.unitMeta = context.fiscal.unitMeta;

    // Build online allegiance compatibility map: allegianceKey → true/false.
    // Used in the template to grey out allegiances unavailable to this org type.
    context.onlineAllegianceCompat = {};
    for (const [key, entry] of Object.entries(ONLINE_ALLEGIANCE_REGISTRY)) {
        const compat = entry.compatible;
        context.onlineAllegianceCompat[key] = compat === 'all' || compat.includes(orgType);
    }

    // Psyop campaign bonus lookup (keyed by campaignId, built from phase checkboxes)
    const PHASE_ORDER = ['Planning','Development','Testing','Media','Fieldwork','Post Test','Analysis'];
    const campaigns = context.system.conflict?.psyopCampaigns || {};
    context.psyopCampaigns = Object.entries(campaigns).map(([id, c]) => {
        const completedPhases = PHASE_ORDER.filter(p => c.phases?.[p]);
        const phaseCount = completedPhases.length;
        // Bonus description per phase milestone
        let bonusLabel = 'No effect yet';
        if (phaseCount >= 7) bonusLabel = '+Sympathizers to ALL units (permanent)';
        else if (phaseCount >= 6) bonusLabel = '+Sympathizers to all units';
        else if (phaseCount >= 5) bonusLabel = '+Sympathizers to any two units';
        else if (phaseCount >= 4) bonusLabel = '+Sympathizers to one designated unit';
        else if (phaseCount >= 3) bonusLabel = 'Can directly contest one resistance aspect';
        else if (phaseCount >= 1) bonusLabel = 'Intel phase — no combat bonus yet';
        return { id, ...c, completedPhases, phaseCount, bonusLabel, phaseOrder: PHASE_ORDER };
    });

    // Reputation pool — Size + Budget points, distributed between IR_perm and ER_perm
    const irPerm = Number(context.system.attributes.internalReputation?.perm) || 0;
    const erPerm = Number(context.system.attributes.externalReputation?.perm) || 0;
    context.repPool = {
        total: orgSize + budget,
        spent: irPerm + erPerm,
        remaining: (orgSize + budget) - (irPerm + erPerm),
    };

    // Structure & Mandates
    context.mandates = Object.entries(context.system.mandates || {}).map(([id, m]) => ({ id, ...m }));

    // Phases & Operations
    const rawPhases = context.system.phases || {};
    context.phases = Object.entries(rawPhases).map(([id, phase]) => {
        const operations = Object.entries(phase.operations || {}).map(([oid, op]) => {
            const engagements = Object.entries(op.engagements || {}).map(([eid, e]) => ({ id: eid, ...e }));
            return { id: oid, ...op, engagements };
        });
        const events = Object.entries(phase.events || {}).map(([eid, e]) => ({ id: eid, ...e }));
        return { id, ...phase, operations, events };
    }).sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

    // Conflict Wounds Processing
    const rawWounds = context.system.conflict?.wounds ?? {};
    const woundEntries = [];
    for (let i = 0; i < 5; i++) {
        const woundData = rawWounds[i] || {};
        woundEntries.push({
            key: i,
            rip: Number(woundData.rip) || 0,
            mip: Number(woundData.mip) || 0,
            type: woundData.type ?? "",
            bleeding: woundData.bleeding ?? false
        });
    }
    context.woundEntries = woundEntries;

    const ripTotal = woundEntries.reduce((total, w) => total + (Number(w.rip) || 0), 0);
    const mipTotal = woundEntries.reduce((total, w) => total + (Number(w.mip) || 0), 0);

    const ir = Number(context.system.attributes.internalReputation?.perm) || 0;
    const er = Number(context.system.attributes.externalReputation?.perm) || 0;
    const { force, intel, influence, comms } = context.fiscal.derived;

    // max RIP = (IR + ER) × 2
    // max MIP = sum of all four derived attributes (broad capability = more to lose)
    const maxRip = (ir + er) * 2;
    const maxMip = force + intel + influence + comms;

    context.system.conflict.summary = {
        ripTotal, mipTotal,
        ripRemaining: Math.max(0, maxRip - ripTotal),
        mipRemaining: Math.max(0, maxMip - mipTotal),
        maxRip, maxMip,
        // Which penalty applies to which rolls:
        // MIP → Force & Intel rolls  (bodies lost hurts physical/espionage ops)
        // RIP → Influence & Comms rolls  (rep damage hurts psyops/online ops)
        mipPenalty: -mipTotal,
        ripPenalty: -ripTotal,
    };

    return context;
}
