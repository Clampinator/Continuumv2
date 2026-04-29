import { deriveResonanceOrigin } from './derive-resonance-origin.js';
import { assembleLifelineCoordinates } from './assemble-lifeline-coordinates.js';
import { aggregateActiveExperiences } from './aggregate-active-experiences.js';
import { applyDateFallback } from './apply-date-fallback.js';
import { mapYearsToBonus } from './map-years-to-bonus.js';
import { SECONDS_IN_YEAR_STRICT } from '/systems/continuum-v2/modules/temporal-engine/constants.js';

/**
 * Calculates current resonance bonuses for all experiences on an actor.
 * ONE FUNCTION PER FILE: calculateResonanceBonuses.
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

    // 4. Transform metadata into final bonuses
    // Dual-format accessor: aggregateActiveExperiences may store .age
    // (new engine) or .eventAge (legacy). Prefer .age, fall back to .eventAge.
    expMap.forEach((data) => {
        const age = data.age !== undefined ? data.age : data.eventAge;
        const diffSeconds = data.isOngoing ? 0 : (nowAge - age);
        const diffYears = diffSeconds / SECONDS_IN_YEAR_STRICT;
        
        const bonus = mapYearsToBonus(diffYears);
        
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
