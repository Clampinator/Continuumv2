/**
 * get-economic-report.js
 *
 * Generates the full fiscal state of an org each render cycle.
 * Replaces the AP/UP point-buy report with the MP/RP aspect-cost model.
 */

import { calculateUnitCost, deriveAttributes, maxAspectBySize } from './calculate-unit-costs.js';
import { unitHardCap } from './economic-registry.js';

/**
 * @param {Actor} actor
 * @returns {object} fiscal report — attached to context.fiscal in prepareOrganizationData
 *
 * Shape:
 * {
 *   mp:           { total, spent, remaining }
 *   rp:           { total, spent, remaining }
 *   overextension:{ isOverextended, mpPenalty, rpPenalty, mpOver, rpOver }
 *   derived:      { force, intel, influence, comms }     ← read-only attributes
 *   sizeAspectCap: number                                ← max aspect from size alone
 *   unitReports:  { physical: {id: {mp,rp,aspects}}, … }
 *   orgType:      string
 * }
 */
export function getEconomicReport(actor) {
    const system  = actor.system;
    const orgType = system.structure?.type   || 'Social';
    const size    = Number(system.structure?.size)   || 1;
    const budget  = Number(system.structure?.budget) || 1;
    const ir      = Number(system.attributes?.internalReputation?.perm)  || 0;

    // ── Resource pools ────────────────────────────────────────────────────────
    const mpTotal = size   * 10;
    const rpTotal = budget * 10;

    // ── Unit cost sweep ───────────────────────────────────────────────────────
    let mpSpent = 0;
    let rpSpent = 0;
    const unitReports = { physical: {}, espionage: {}, online: {}, psyops: {} };

    for (const unitType of ['physical', 'espionage', 'online', 'psyops']) {
        for (const [id, unit] of Object.entries(system.conflict?.[unitType] || {})) {
            const cost = calculateUnitCost(unitType, unit, orgType, size, ir);
            mpSpent += cost.mp;
            rpSpent += cost.rp;
            unitReports[unitType][id] = cost;
        }
    }

    // ── Overextension ─────────────────────────────────────────────────────────
    const mpOver = Math.max(0, mpSpent - mpTotal);
    const rpOver = Math.max(0, rpSpent - rpTotal);
    const isOverextended = mpOver > 0 || rpOver > 0;

    // Penalty scales with severity (measured against the larger pool)
    const mpSev = mpTotal > 0 ? mpOver / mpTotal : 0;
    const rpSev = rpTotal > 0 ? rpOver / rpTotal : 0;
    const sev   = Math.max(mpSev, rpSev);
    // slight ≤10%: –1 to affected rolls; moderate ≤25%: –2; severe >25%: –2 + no new units
    const overPenalty = !isOverextended ? 0 : sev > 0.25 ? -2 : sev > 0.10 ? -2 : -1;

    // ── Derived attributes ─────────────────────────────────────────────────────
    const derived = deriveAttributes(system.conflict || {}, size, ir);

    // ── Unit meta (count vs hard cap per type) ────────────────────────────────
    const unitMeta = {};
    for (const unitType of ['physical', 'espionage', 'online', 'psyops']) {
        const count = Object.keys(system.conflict?.[unitType] || {}).length;
        const cap   = unitHardCap(unitType, size, budget);
        unitMeta[unitType] = { count, cap, atCap: count >= cap };
    }

    return {
        mp:  { total: mpTotal,  spent: mpSpent,  remaining: mpTotal  - mpSpent  },
        rp:  { total: rpTotal,  spent: rpSpent,  remaining: rpTotal  - rpSpent  },
        overextension: {
            isOverextended,
            penalty: overPenalty,
            mpOver, rpOver,
            severe: sev > 0.25,
        },
        derived,
        sizeAspectCap: maxAspectBySize(size),
        unitReports,
        unitMeta,
        orgType,
    };
}
