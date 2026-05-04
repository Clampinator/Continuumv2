import { parseDate } from './parse-date.js';

/**
 * MAP DATE TO SUBJECTIVE (Coordinate Authority)
 * Projects an objective calendar date onto the character's subjective timeline.
 * Supports both .age/.time (New Engine) and .x/.y (Legacy) formats.
 * 
 * @param {Date|string} targetDate - The date to project.
 * @param {Array} lifelinePoints - The array of calculated path nodes.
 * @param {number} dobTs - The origin timestamp of the character.
 * @returns {number} The calculated subjective age in seconds.
 */
export function mapDateToSubjective(targetDate, lifelinePoints, dobTs) {
    const dateObj = (targetDate instanceof Date) ? targetDate : parseDate(targetDate);
    if (!dateObj || isNaN(dateObj.getTime())) return null;
    
    const targetTs = dateObj.getTime();

    // If no path exists, default to linear projection from Birth
    if (!lifelinePoints || lifelinePoints.length === 0) {
        return Math.max(0, (targetTs - (dobTs || 0)) / 1000);
    }

    let bestMatchAge = null;

    // 1. Scan Path Segments for Containment
    for (let i = 0; i < lifelinePoints.length - 1; i++) {
        const p1 = lifelinePoints[i];
        const p2 = lifelinePoints[i+1];

        // Accessors support both coordinate schemas
        const x1 = p1.age !== undefined ? p1.age : p1.x;
        const y1 = p1.time !== undefined ? p1.time : p1.y;
        const x2 = p2.age !== undefined ? p2.age : p2.x;
        const y2 = p2.time !== undefined ? p2.time : p2.y;
        
        const outgoing = p1.outgoingType || p1.type;
        const p1IsSpan = outgoing === 'span' || p1.isSpanOrigin || Boolean(p1.record?.eventIsSpan) || (x1 === x2 && Math.abs(y2 - y1) > 1000);

        // Skip vertical jumps (Spans) for linear interpolation.
        // Spans are instantaneous - departure age equals arrival age (x1).
        // Match both departure (y1) and arrival (arrivalY) timestamps to x1.
        if (p1IsSpan) {
            if (Math.abs(targetTs - y1) < 1000) bestMatchAge = x1;
            if (Math.abs(targetTs - (p1.arrivalY ?? y1)) < 1000) bestMatchAge = x1;
            continue;
        }

        const minT = Math.min(y1, y2);
        const maxT = Math.max(y1, y2);

        if (targetTs >= minT && targetTs <= maxT) {
            const timeDelta = y2 - y1;
            if (timeDelta !== 0) {
                const ratio = (targetTs - y1) / timeDelta;
                bestMatchAge = x1 + (ratio * (x2 - x1));
            } else {
                bestMatchAge = x1;
            }
        }
    }

    // 2. If date is found on the lifeline, return it
    if (bestMatchAge !== null) return bestMatchAge;

    // 3. Fallback: Linear Extrapolation from boundaries
    const pFirst = lifelinePoints[0];
    const pLast = lifelinePoints[lifelinePoints.length - 1];
    
    const xFirst = pFirst.age !== undefined ? pFirst.age : pFirst.x;
    const yFirst = pFirst.time !== undefined ? pFirst.time : pFirst.y;
    const xLast = pLast.age !== undefined ? pLast.age : pLast.x;
    const yLast = pLast.time !== undefined ? pLast.time : pLast.y;

    if (targetTs < yFirst) {
        return xFirst - ((yFirst - targetTs) / 1000);
    } else {
        return xLast + ((targetTs - yLast) / 1000);
    }
}
