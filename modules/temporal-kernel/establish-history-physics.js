import { parseObjectiveTimestamp } from './parse-objective-timestamp.js';
import { projectSubjectiveAge } from './project-subjective-age.js';

/**
 * TEMPORAL KERNEL: ESTABLISH HISTORY PHYSICS
 * The single source of truth for converting raw character facts into 
 * physical world coordinates (x, y).
 * 
 * ENFORCES: Linear Subjective Time.
 * ENFORCES: Discrete Objective Jumps (Spans).
 * ENFORCES: Birth Authority (Age 0 = originTime).
 * 
 * @param {Array} historyFacts - Flat array of { id, sort, record }
 * @param {number} originTime - Mathematical timestamp of birth (ms).
 * @param {number} [subjectiveNow] - Optional override for the current age (s).
 * @returns {Array} Array of physical nodes with { x, y, arrivalY }.
 */
export function establishHistoryPhysics(historyFacts, originTime, subjectiveNow = null) {
    const physicalNodes = [];
    
    // 1. Resolve Origin
    // The character's physical journey ALWAYS begins at Age 0.
    let currentOffset = Number(originTime) || 0;

    // 2. Sort by Narrative Order
    // AUTHORITY: Narrative sequence (Sort) defines the character's journey.
    const sorted = [...historyFacts].sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

    for (const fact of sorted) {
        const record = fact.record || {};
        
        if (fact.isNow || fact.id === 'now') {
            const y = Number(record.objectiveNow || record.ts) || Date.now();
            const calculatedAge = projectSubjectiveAge(y, currentOffset);
            
            // AUTHORITY: Detect if the character is currently Spanning.
            // If the provided subjectiveNow (Age) differs from the calculated one,
            // they have broken the rail.
            const isSpanningNow = subjectiveNow !== null && Math.abs(subjectiveNow - calculatedAge) > 0.1;
            
            const x = isSpanningNow ? subjectiveNow : calculatedAge;

            physicalNodes.push({ 
                ...fact, 
                x, y, arrivalY: y,
                isSpanOrigin: isSpanningNow // Ends the previous leveling segment
            });
            continue;
        }

        const eventIsSpan = !!record.eventIsSpan;

        // 3. Establish Departure (Objective Time / Physics Y)
        // AUTHORITY: Prefer raw timestamp from fact to prevent string re-parsing drift.
        const y = Number(record.ts) || (parseObjectiveTimestamp(
            eventIsSpan ? (record.eventSpanFromDate || record.eventDate) : record.eventDate,
            eventIsSpan ? (record.eventSpanFromTime || record.eventTime) : record.eventTime,
            { timezone: 'UTC' }
        ) || originTime);

        // 4. Project Subjective Age (Physics X)
        // Law: Age = (Time - WorldOffset) / 1000
        const x = projectSubjectiveAge(y, currentOffset);

        let arrivalY = y;
        if (eventIsSpan) {
            // 5. Resolve Span Arrival
            // AUTHORITY: Prefer raw arrivalTs from fact.
            arrivalY = Number(record.arrivalTs) || (parseObjectiveTimestamp(
                record.eventSpanToDate || record.eventDate,
                record.eventSpanToTime || record.eventTime || '12:00:00',
                { timezone: 'UTC' }
            ) || y);

            // 6. Update World Offset for subsequent nodes
            // The character has shifted their "Today" relative to the World.
            // newOffset = ArrivalTime - AgeAtDeparture * 1000
            currentOffset = arrivalY - (x * 1000);
        }

        physicalNodes.push({
            ...fact,
            x,
            y,
            arrivalY,
            isSpanOrigin: eventIsSpan
        });
    }

    return physicalNodes;
}
