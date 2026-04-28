import { projectSubjectiveAge } from './project-subjective-age.js';
import { parseObjectiveTime } from '../temporal-translator/coordinate-converter.js';
import { resolveLocationContext } from '../temporal-translator/location-resolver.js';

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
 * @param {Object} [actor] - character actor for context fallback
 * @returns {Array} Array of physical nodes with { x, y, arrivalY }.
 */
export function establishHistoryPhysics(historyFacts, originTime, subjectiveNow = null, actor = null) {
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
            console.group('SPAN DEBUG | STEP 5 | ESTABLISH HISTORY PHYSICS - NOW node placement');
            console.log('objectiveNow (y):', y);
            console.log('currentOffset at time of NOW node:', currentOffset);
            console.log('calculatedAge from offset:', calculatedAge);
            console.log('subjectiveNow override:', subjectiveNow);
            console.log('EXPECT: currentOffset != originTime if a span preceded this node.');
            console.groupEnd();
            
            // AUTHORITY: Detect if the character is currently Spanning.
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
        // AUTHORITY: Location field defines the local timezone.
        const context = resolveLocationContext(physicalNodes, projectSubjectiveAge(Number(record.ts) || originTime, currentOffset), actor);

        const y = Number(record.ts) || (parseObjectiveTime(
            eventIsSpan ? (record.eventSpanFromDate || record.eventDate) : record.eventDate,
            eventIsSpan ? (record.eventSpanFromTime || record.eventTime) : record.eventTime,
            context
        ) || originTime);

        // 4. Project Subjective Age (Physics X)
        // Law: Age = (Time - WorldOffset) / 1000
        const x = projectSubjectiveAge(y, currentOffset);

        let arrivalY = y;
        if (eventIsSpan) {
            // 5. Resolve Span Arrival
            arrivalY = Number(record.arrivalTs) || (parseObjectiveTime(
                record.eventSpanToDate || record.eventDate,
                record.eventSpanToTime || record.eventTime || '12:00:00',
                context
            ) || y);

            // 6. Update World Offset for subsequent nodes
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
