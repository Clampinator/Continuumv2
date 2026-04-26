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
 * @returns {Array} Array of physical nodes with { x, y, arrivalY }.
 */
export function establishHistoryPhysics(historyFacts, originTime) {
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
            const x = projectSubjectiveAge(y, currentOffset);
            physicalNodes.push({ ...fact, x, y, arrivalY: y });
            continue;
        }

        const isSpan = !!record.isSpan;

        // 3. Establish Departure (Objective Time / Physics Y)
        const dateStr = isSpan ? (record.spanFromDate || record.date) : record.date;
        const timeStr = isSpan ? (record.spanFromTime || record.time) : record.time;
        
        // Note: We use UTC as the system mathematical base.
        const y = parseObjectiveTimestamp(dateStr, timeStr, { timezone: 'UTC' }) || originTime;

        // 4. Project Subjective Age (Physics X)
        // Law: Age = (Time - WorldOffset) / 1000
        const x = projectSubjectiveAge(y, currentOffset);

        let arrivalY = y;
        if (isSpan) {
            // 5. Resolve Span Arrival
            const toDate = record.spanToDate || record.date;
            const toTime = record.spanToTime || record.time || '12:00:00';
            arrivalY = parseObjectiveTimestamp(toDate, toTime, { timezone: 'UTC' }) || y;

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
            isSpanOrigin: isSpan
        });
    }

    return physicalNodes;
}
