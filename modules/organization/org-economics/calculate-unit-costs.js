/**
 * calculate-unit-costs.js
 *
 * Replaces calculate-attribute-cost.js.
 * All org economics math lives here:
 *   - per-unit MP/RP cost
 *   - per-aspect effective cap (size + IR + shade)
 *   - attribute derivation from summed aspects
 */

import {
    ASPECT_BASE_COSTS,
    ORG_TYPE_MULTIPLIERS,
    SHADE_COST_MULTIPLIERS,
    SHADE_ASPECT_CAPS,
    IR_CAPPED_ASPECTS,
    ATTR_DIVISORS,
    UNIT_TYPE_TO_ATTR,
    ACTIVATION_COSTS,
    ONLINE_ALLEGIANCE_REGISTRY,
} from './economic-registry.js';

/**
 * Maximum aspect rating permitted by org size.
 *   Size 1–2 → 1,  3–4 → 2,  5–6 → 3,  7–8 → 4,  9–10 → 5
 */
export function maxAspectBySize(size) {
    return Math.min(5, Math.ceil(Number(size) / 2));
}

/**
 * Effective maximum for a single aspect on a single unit.
 * Applies size cap, then IR cap, then shade cap — takes the lowest.
 *
 * @param {string} unitType  - 'physical' | 'espionage' | 'online' | 'psyops'
 * @param {string} aspectKey
 * @param {number} orgSize   - org size tier 1–10
 * @param {number} ir        - internal reputation 0–10
 * @param {string} shade     - 'white' | 'grey' | 'black' (psyops only, else ignored)
 * @returns {number}  0–5
 */
export function getAspectCap(unitType, aspectKey, orgSize, ir, shade) {
    let cap = maxAspectBySize(orgSize);

    // IR cap — with shade exceptions for psyops
    let irCapped = IR_CAPPED_ASPECTS[unitType]?.includes(aspectKey) ?? false;
    if (unitType === 'psyops' && shade === 'black' && aspectKey === 'ruthlessness') irCapped = false;
    if (unitType === 'psyops' && shade === 'white' && aspectKey === 'sympathizers') irCapped = false;
    if (irCapped) cap = Math.min(cap, ir);

    // Shade cap (psyops only)
    if (unitType === 'psyops' && shade) {
        const shadeCap = SHADE_ASPECT_CAPS[shade]?.[aspectKey];
        if (shadeCap !== undefined) cap = Math.min(cap, shadeCap);
    }

    return Math.max(0, cap);
}

/**
 * Calculates the total MP and RP cost of a single unit.
 *
 * @param {string} unitType  - 'physical' | 'espionage' | 'online' | 'psyops'
 * @param {object} unit      - raw unit data from actor.system.conflict[type]
 * @param {string} orgType   - org type string
 * @returns {{ mp: number, rp: number, aspects: object }}
 *   aspects maps aspectKey → { value, mp, rp, cap }
 */
export function calculateUnitCost(unitType, unit, orgType, orgSize, ir) {
    const baseCosts  = ASPECT_BASE_COSTS[unitType] || {};
    const typeMult   = ORG_TYPE_MULTIPLIERS[orgType]?.[unitType] ?? 1.0;
    const shade      = unit.shade || 'grey';
    const baseActivation = ACTIVATION_COSTS[unitType] || { mp: 0, rp: 0 };

    // Online units: allegiance modifies aspect caps and activation cost.
    let allegianceCapMods = {};
    let activationMult = 1.0;
    if (unitType === 'online' && unit.type) {
        const entry = ONLINE_ALLEGIANCE_REGISTRY[unit.type];
        if (entry) {
            allegianceCapMods = entry.capMods || {};
            activationMult    = entry.activationMult ?? 1.0;
        }
    }

    const activation = {
        mp: Math.round(baseActivation.mp * activationMult),
        rp: Math.round(baseActivation.rp * activationMult),
    };

    let totalMp = activation.mp;
    let totalRp = activation.rp;
    const aspects = {};

    for (const [aspect, [baseMp, baseRp]] of Object.entries(baseCosts)) {
        const raw = Math.max(0, Number(unit[aspect]) || 0);

        // Base cap from size + IR + shade
        let cap = getAspectCap(unitType, aspect, orgSize, ir, shade);

        // Apply allegiance cap modifier for online units (clamped to 0–5)
        if (unitType === 'online') {
            cap = Math.max(0, Math.min(5, cap + (allegianceCapMods[aspect] ?? 0)));
        }

        const value = Math.min(raw, cap);

        let shadeMult = 1.0;
        if (unitType === 'psyops') shadeMult = SHADE_COST_MULTIPLIERS[shade]?.[aspect] ?? 1.0;

        const mp = Math.round(value * baseMp * typeMult * shadeMult);
        const rp = Math.round(value * baseRp * typeMult * shadeMult);

        totalMp += mp;
        totalRp += rp;
        aspects[aspect] = { value, raw, cap, mp, rp };
    }

    return { mp: totalMp, rp: totalRp, activation, aspects };
}

/**
 * Derives Force / Intel / Influence / Comms from summed unit aspect ratings.
 * Values are clamped by effective caps before summing (over-cap aspects don't contribute).
 *
 * @param {object} conflict  - actor.system.conflict
 * @param {number} orgSize
 * @param {number} ir        - internal reputation
 * @returns {{ force, intel, influence, comms }}  each 0–10
 */
export function deriveAttributes(conflict, orgSize, ir) {
    const sums = { force: 0, intel: 0, influence: 0, comms: 0 };

    for (const [unitType, attrKey] of Object.entries(UNIT_TYPE_TO_ATTR)) {
        const units     = Object.values(conflict[unitType] || {});
        const baseCosts = ASPECT_BASE_COSTS[unitType] || {};

        for (const unit of units) {
            const shade = unit.shade || 'grey';
            const allegianceCapMods = (unitType === 'online' && unit.type)
                ? (ONLINE_ALLEGIANCE_REGISTRY[unit.type]?.capMods || {})
                : {};
            for (const aspect of Object.keys(baseCosts)) {
                const raw = Math.max(0, Number(unit[aspect]) || 0);
                let cap = getAspectCap(unitType, aspect, orgSize, ir, shade);
                if (unitType === 'online') {
                    cap = Math.max(0, Math.min(5, cap + (allegianceCapMods[aspect] ?? 0)));
                }
                sums[attrKey] += Math.min(raw, cap);
            }
        }
    }

    return {
        force:     Math.min(10, Math.floor(sums.force     / ATTR_DIVISORS.force)),
        intel:     Math.min(10, Math.floor(sums.intel     / ATTR_DIVISORS.intel)),
        influence: Math.min(10, Math.floor(sums.influence / ATTR_DIVISORS.influence)),
        comms:     Math.min(10, Math.floor(sums.comms     / ATTR_DIVISORS.comms)),
    };
}
