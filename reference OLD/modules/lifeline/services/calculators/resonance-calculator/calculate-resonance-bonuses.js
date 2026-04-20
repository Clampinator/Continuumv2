import { deriveResonanceOrigin } from './derive-resonance-origin.js';
import { assembleLifelineCoordinates } from './assemble-lifeline-coordinates.js';
import { aggregateActiveExperiences } from './aggregate-active-experiences.js';
import { applyDateFallback } from './apply-date-fallback.js';
import { mapYearsToBonus } from './map-years-to-bonus.js';

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

    const SECONDS_PER_YEAR = 31536000;
    const results = [];

    // 4. Transform metadata into final bonuses
    expMap.forEach((data) => {
        const diffSeconds = data.isOngoing ? 0 : (nowAge - data.age);
        const diffYears = diffSeconds / SECONDS_PER_YEAR;
        
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