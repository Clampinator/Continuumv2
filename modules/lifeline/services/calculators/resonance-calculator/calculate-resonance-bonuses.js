import { deriveResonanceOrigin } from './derive-resonance-origin.js';
import { assembleLifelineCoordinates } from './assemble-lifeline-coordinates.js';
import { aggregateActiveExperiences } from './aggregate-active-experiences.js';
import { applyDateFallback } from './apply-date-fallback.js';
import { calculateExperienceBonus } from '/systems/continuum-v2/modules/temporal-kernel/calculate-experience-bonus.js';

/**
 * Calculates current resonance bonuses for all experiences on an actor.
 * Uses The Forgetting (lesser of duration, distance) matching
 * the Continuum RPG mechanic: you remember the LESSER of how
 * long you did something and how recently you did it.
 *
 * @param {Actor} actor
 * @returns {Array} List of { name, bonus, yearsSince }
 */
export function calculateResonanceBonuses(actor) {
    // 1. Setup context and coordinates
    const dobTs = deriveResonanceOrigin(actor);
    const spanLevel = Number(actor.system.spanning?.span) || 0;
    const engineResults = assembleLifelineCoordinates(actor, dobTs, spanLevel);

    const nowAge = engineResults.nowNode.age;
    const nodes = engineResults.levelNodes;

    // 2. Extract experience metadata from the lifeline
    const expMap = aggregateActiveExperiences(nodes, actor);

    // 3. Apply fallback for event-less experiences
    applyDateFallback(expMap, actor, nodes);

    const results = [];

    // 4. Transform metadata into final bonuses using two-axis calculation
    // Dual-format accessor: aggregateActiveExperiences may store .age
    // (new engine) or .eventAge (legacy). Prefer .age, fall back to .eventAge.
    expMap.forEach((data) => {
        const endAge = data.age !== undefined ? data.age : data.eventAge;
        const startAge = data.startAge !== undefined ? data.startAge : endAge;
        const isOngoing = !!data.isOngoing;

        // The Forgetting: bonus is lesser of duration and distance
        const bonus = calculateExperienceBonus(isOngoing, endAge, startAge, nowAge);

        // Years since ended (for display in the dropdown)
        const diffSeconds = isOngoing ? 0 : (nowAge - endAge);
        const diffYears = diffSeconds / 31536000;

        if (bonus > 0) {
            results.push({
                name: data.name,
                bonus: bonus,
                yearsSince: diffYears
            });
        }
    });

    return results.sort((a, b) => b.bonus - a.bonus);
}
