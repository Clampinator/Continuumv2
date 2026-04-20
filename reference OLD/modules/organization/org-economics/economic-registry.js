/**
 * THE FISCAL REGISTRY
 *
 * POOLS
 *   Manpower Pool (MP) = Size × 10   (10–100)
 *   Resource Pool (RP) = Budget × 10 (10–100)
 *
 * UNIT ASPECTS  (rated 0–5)
 *   Each point costs [mp, rp].
 *   Final cost = base × orgType multiplier × shade multiplier (psyops only).
 *
 * ATTRIBUTE DERIVATION  (read-only)
 *   Force     = min(10, floor( Σ Physical aspects  / 5 ))
 *   Intel     = min(10, floor( Σ Espionage aspects / 5 ))
 *   Influence = min(10, floor( Σ Psyops aspects    / 4 ))  ← 3 aspects, lower divisor
 *   Comms     = min(10, floor( Σ Online aspects    / 5 ))
 */

/** Base [mp, rp] cost per point of each aspect. */
export const ASPECT_BASE_COSTS = {
    physical: {
        cohesion:      [2, 0],
        effectiveness: [2, 1],
        training:      [1, 2],
        experience:    [3, 1],
    },
    espionage: {
        integrity:  [1, 1],
        appeal:     [1, 2],
        training:   [1, 2],
        experience: [2, 1],
    },
    online: {
        l33t:   [1, 2],
        grok:   [1, 1],
        pwn:    [1, 2],
        phreak: [1, 1],
    },
    psyops: {
        ruthlessness: [2, 1],
        resources:    [0, 3],
        sympathizers: [2, 2],
    },
};

/** Cost multiplier applied to ALL aspects of a unit type based on org type. */
export const ORG_TYPE_MULTIPLIERS = {
    Military:    { physical: 0.5, espionage: 1.0, psyops: 1.5, online: 2.0 },
    Religious:   { physical: 1.0, espionage: 1.5, psyops: 0.5, online: 1.5 },
    Political:   { physical: 1.5, espionage: 1.0, psyops: 0.5, online: 1.0 },
    Commercial:  { physical: 1.5, espionage: 0.5, psyops: 1.0, online: 0.5 },
    Social:      { physical: 1.0, espionage: 1.0, psyops: 0.5, online: 1.0 },
    Educational: { physical: 2.0, espionage: 1.0, psyops: 1.0, online: 0.5 },
    Charitable:  { physical: 2.0, espionage: 1.5, psyops: 0.5, online: 1.0 },
};

/**
 * Per-aspect cost multipliers for Psyops shade.
 * Stacks on top of the org-type multiplier.
 * White ops: cheap sympathizers, expensive ruthlessness.
 * Black ops: cheap ruthlessness, expensive sympathizers.
 * Phase 7 bonus for black ops is halved (fear ≠ genuine allies).
 */
export const SHADE_COST_MULTIPLIERS = {
    white: { ruthlessness: 2.0, resources: 1.0, sympathizers: 0.5 },
    grey:  { ruthlessness: 1.0, resources: 1.0, sympathizers: 1.0 },
    black: { ruthlessness: 0.5, resources: 1.0, sympathizers: 2.0 },
};

/**
 * Hard upper cap on specific Psyops aspects imposed by shade.
 * Stacks with (further reduces) the size cap and IR cap.
 * White: can't exceed ruthlessness 2 — ethical doctrine.
 * Black: can't exceed sympathizers 2 — burned their goodwill.
 */
export const SHADE_ASPECT_CAPS = {
    white: { ruthlessness: 2 },
    grey:  {},
    black: { sympathizers: 2 },
};

/**
 * Aspects that are hard-capped by Internal Reputation value.
 * These require genuine loyalty/belief; they collapse when morale falls.
 *
 * Exceptions applied in code:
 *   Black shade → ruthlessness is NOT IR-capped (coercion works without morale).
 *   White shade → sympathizers is NOT IR-capped (principled causes rally even in hardship).
 */
export const IR_CAPPED_ASPECTS = {
    physical:  ['cohesion'],
    espionage: ['integrity'],
    psyops:    ['ruthlessness', 'sympathizers'],
    online:    [],
};

/** Divisors for Σ-aspect → attribute derivation. */
export const ATTR_DIVISORS = {
    force:     5,
    intel:     5,
    influence: 4,
    comms:     5,
};

/** Which attribute each unit type contributes to. */
export const UNIT_TYPE_TO_ATTR = {
    physical:  'force',
    espionage: 'intel',
    psyops:    'influence',
    online:    'comms',
};

/** Flat activation cost (MP + RP) per unit, paid just for existing. */
export const ACTIVATION_COSTS = {
    physical:  { mp: 2, rp: 0 },
    espionage: { mp: 1, rp: 1 },
    online:    { mp: 0, rp: 2 },
    psyops:    { mp: 1, rp: 2 },
};

/**
 * Minimum org size tier required to field each physical unit size.
 * Keys match the stored option values exactly.
 */
export const PHYSICAL_SIZE_TIERS = {
    'Team (2 - 4)':              1,
    'Squad (6 - 12)':            2,
    'Section (12 - 24)':         2,
    'Platoon (20 - 50)':         3,
    'Echelon (50 - 90)':         3,
    'Company (100 - 250)':       4,
    'Battalion (300 - 1k)':      5,
    'Regiment (1k - 3k)':        6,
    'Brigade (3k - 5k)':         6,
    'Division (6k - 25k)':       7,
    'Corps (20k - 60k)':         8,
    'Field Army (100k - 200k)':  8,
    'Army Group (400k - 1M)':    9,
    'Combat Command (1M - 10M)': 10,
};

/**
 * Minimum org size tier required to field each espionage unit size.
 */
export const ESPIONAGE_SIZE_TIERS = {
    'Agent (1)':             1,
    'Team (2 - 4)':          1,
    'Squad (6 - 12)':        2,
    'Response (12 - 24)':    2,
    'Mission (20 - 50)':     3,
    'Post (50 - 90)':        3,
    'Embassy (100 - 250)':   4,
    'Task Force (300 - 1k)': 5,
    'Agency 1 (1k - 3k)':    6,
    'Agency 2 (3k - 5k)':    7,
    'Agency 3 (6k - 25k)':   8,
    'Agency 4 (20k - 60k)':  9,
};

/**
 * Hard cap on the number of units of each type the org can field.
 * @param {string} unitType
 * @param {number} size    - org size tier 1–10
 * @param {number} budget  - org budget tier 1–10
 * @returns {number}
 */
export function unitHardCap(unitType, size, budget) {
    switch (unitType) {
        case 'physical':  return Math.floor(size / 2) + 1;
        case 'espionage': return Math.floor(size / 3) + 1;
        case 'online':    return Math.floor(budget / 2) + 1;
        case 'psyops':    return Math.floor((size + budget) / 4) + 1;
        default: return 1;
    }
}

/**
 * Online unit allegiance registry.
 *
 * Each entry:
 *   compatible   - array of org type strings, or 'all'
 *   capMods      - additive modifier applied to the size-derived aspect cap (clamped 0–5)
 *   activationMult - multiplier on the base online activation cost (default 1.0)
 *   description  - shown as tooltip on the allegiance select
 *
 * Keys match the stored option values in org-conflict.html exactly.
 */
export const ONLINE_ALLEGIANCE_REGISTRY = {
    'White hat (high - ethical)': {
        compatible: ['Political', 'Commercial', 'Educational', 'Charitable', 'Social'],
        capMods: { l33t: 1, grok: 1, pwn: -2, phreak: 0 },
        activationMult: 1.0,
        description: 'Ethical security researchers. Strong coders, excellent cultural read. Ethical doctrine hard-caps aggression.',
    },
    'Black hat (high - malicious)': {
        compatible: ['Military', 'Commercial'],
        capMods: { l33t: 1, grok: 0, pwn: 2, phreak: 1 },
        activationMult: 1.0,
        description: 'Operate outside the law for profit or ideology. High aggression and hardware skill. Only work for power or money.',
    },
    'Grey hat (high - reporters)': {
        compatible: ['Social', 'Political', 'Charitable', 'Educational', 'Religious'],
        capMods: { l33t: 1, grok: 2, pwn: -1, phreak: 0 },
        activationMult: 1.0,
        description: 'Expose vulnerabilities without permission, often to the press. Unmatched cultural/tech grok. Won\'t work for commercial interests.',
    },
    'Blue hat (low - freelance testers)': {
        compatible: ['Commercial', 'Educational', 'Political', 'Social', 'Charitable'],
        capMods: { l33t: 0, grok: 0, pwn: -2, phreak: 0 },
        activationMult: 1.0,
        description: 'Freelance security testers hired before a product ships. Safe, predictable. Ethical floor prevents serious offensive ops.',
    },
    'Purple hat (low - self-testers)': {
        compatible: 'all',
        capMods: { l33t: 0, grok: 1, pwn: -2, phreak: 0 },
        activationMult: 1.0,
        description: 'Internal testers who probe their own org\'s systems. Ideologically neutral — work for anyone. Good internal grok.',
    },
    'Red hat (low - anti-black hat)': {
        compatible: ['Military', 'Political', 'Charitable'],
        capMods: { l33t: 0, grok: 0, pwn: 1, phreak: 0 },
        activationMult: 1.0,
        description: 'Vigilante hackers who target black hats aggressively. Principled but willing to punch hard.',
    },
    'Green hat (medium - dangerous noobs)': {
        compatible: 'all',
        capMods: { l33t: -1, grok: -1, pwn: 0, phreak: -1 },
        activationMult: 1.0,
        description: 'Enthusiastic beginners learning by doing — dangerously. Take any job. Ceiling is on every technical skill.',
    },
    'Hacktivists (medium)': {
        compatible: ['Political', 'Social', 'Religious', 'Charitable'],
        capMods: { l33t: 0, grok: 2, pwn: 1, phreak: -1 },
        activationMult: 1.0,
        description: 'Politically and socially motivated hackers. Exceptional cultural read. Will not touch Commercial or Military engagements.',
    },
    'Script kiddies (medium)': {
        compatible: 'all',
        capMods: { l33t: -2, grok: -1, pwn: 0, phreak: -2 },
        activationMult: 1.0,
        description: 'Use existing tools without understanding them. Cheap and plentiful. Hard technical ceiling on every skill.',
    },
    'Whistleblowers (medium)': {
        compatible: ['Political', 'Social', 'Charitable', 'Religious'],
        capMods: { l33t: -1, grok: 2, pwn: -1, phreak: -1 },
        activationMult: 1.0,
        description: 'Insider knowledge specialists. Deep grok from proximity to the target. Weak coders, won\'t take illegal risks.',
    },
    'Botnet hackers (high)': {
        compatible: ['Military', 'Commercial', 'Political'],
        capMods: { l33t: 1, grok: 0, pwn: 2, phreak: 1 },
        activationMult: 1.0,
        description: 'Run networks of compromised machines for infrastructure-scale disruption. Work for power and money.',
    },
    'Cryptohackers (high)': {
        compatible: ['Commercial', 'Educational', 'Political'],
        capMods: { l33t: 2, grok: 1, pwn: 0, phreak: 0 },
        activationMult: 1.0,
        description: 'Cryptography and blockchain specialists. Best raw coders available. Narrow, technical focus.',
    },
    'Cryptojackers (high)': {
        compatible: ['Commercial', 'Military'],
        capMods: { l33t: 0, grok: 0, pwn: 1, phreak: 2 },
        activationMult: 1.0,
        description: 'Hijack computing resources for crypto mining. Excellent hardware and firmware reach. Work for profit.',
    },
    'Cyberterrorists (high)': {
        compatible: ['Military'],
        capMods: { l33t: 1, grok: 0, pwn: 3, phreak: 1 },
        activationMult: 1.0,
        description: 'Politically motivated destruction. Extreme aggression ceiling. Only Military orgs absorb the liability.',
    },
    'Elite hackers (high)': {
        compatible: 'all',
        capMods: { l33t: 2, grok: 1, pwn: 1, phreak: 2 },
        activationMult: 3.0,
        description: 'Top-tier professionals across every discipline. Work for anyone who can afford them. Premium activation cost (×3).',
    },
    'Gaming hackers (high)': {
        compatible: ['Social', 'Commercial', 'Educational'],
        capMods: { l33t: 1, grok: 2, pwn: 0, phreak: 0 },
        activationMult: 1.0,
        description: 'Exploit gaming systems and pop culture. Deep grok, often underestimated. Limited to social/commercial contexts.',
    },
    'Malicious insiders (high)': {
        compatible: ['Commercial', 'Political', 'Military'],
        capMods: { l33t: -1, grok: 2, pwn: 2, phreak: -1 },
        activationMult: 1.0,
        description: 'Saboteurs embedded inside target organizations. Insider grok and high aggression compensate for weak coding.',
    },
    'State-sponsored hackers (high)': {
        compatible: ['Military', 'Political'],
        capMods: { l33t: 2, grok: 1, pwn: 2, phreak: 2 },
        activationMult: 2.0,
        description: 'Government-backed cyber units. Elite across all aspects. Only work for state-level power. Elevated activation cost (×2).',
    },
};
