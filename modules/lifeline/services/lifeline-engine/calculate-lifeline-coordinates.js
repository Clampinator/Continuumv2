
import { SpanPool } from '../../calculators/span-pool.js';
import { getNodeLocation } from '../node-location-master.js';
import { processSpanEvent } from './process-span-event.js';
import { processLevelEvent } from './process-level-event.js';
import { MS_PER_SECOND } from '../../../temporal-engine/constants.js';
import { projectObjectiveTime } from '/systems/continuum-v2/modules/temporal-kernel/project-subjective-age.js';

/*
THE DIAGONAL AUTHORITY: Core Mapping Engine.
Enforces the physical law: 1s Subjective Age (X) = 1000ms Objective Time (Y).
*/
export function calculateLifelineCoordinates(orderedEvents, dobTs, spanLevel, actor) {
    if (!dobTs || isNaN(dobTs) || dobTs === 0) {
        return {
            levelNodes: [],
            remainingSpanSeconds: SpanPool.getCapacity(spanLevel),
            nowNode: { age: 0, time: 0, type: 'init', arrivedVia: 'init' },
            spanRank: spanLevel
        };
    }

    const maxSpanPool = SpanPool.getCapacity(spanLevel);
    let levelNodes = [];

    // 1. Genesis
    const genesisNode = getNodeLocation({ type: 'origin', dobTs });
    if (genesisNode) levelNodes.push(genesisNode);

  // 2. Sequence-Ordered Subjective Stream
  // Sort by sequence position (sort field), not stored age. Age is derived from
  // objective date inside process-level/span-event, so the stored age value is
  // never the authority for ordering. sort -> createdAt -> id is stable and
  // reflects the order events were placed on the timeline.
  const subjectiveStream = [...(orderedEvents || [])].sort((a, b) => {
    const sortA = Number(a.sort) || 0;
    const sortB = Number(b.sort) || 0;
    if (sortA !== sortB) return sortA - sortB;
    const createA = Number(a.createdAt) || 0;
    const createB = Number(b.createdAt) || 0;
    if (createA !== createB) return createA - createB;
    return String(a.id).localeCompare(String(b.id));
  });

    // objectiveOffset tracks the "drift" caused by spans.
    let objectiveOffset = dobTs;
    // spentInCurrentCycle accumulates span costs since the last rest.
    let spentInCurrentCycle = 0;

    subjectiveStream.forEach(event => {
        if (event.eventIsSpan) {
            const result = processSpanEvent(event, objectiveOffset);
            levelNodes.push(...result.nodes);
            // Span cost = absolute time jump in seconds
            const originTime = result.nodes[0].time;
            const destTime   = result.nodes[1].time;
            spentInCurrentCycle += Math.abs(destTime - originTime) / MS_PER_SECOND;
            // Spans reset the rail's objective starting point
            objectiveOffset = result.newOffset;
        } else {
            // A rest event refreshes the span pool
            if (event.eventIsRest) spentInCurrentCycle = 0;
            // Level events are forced onto the diagonal rail
            const node = processLevelEvent(event, objectiveOffset);
            if (node) levelNodes.push(node);
        }
    });

    // 3. Current "Now" Position (The Head)
    const lastHistory = levelNodes[levelNodes.length - 1];
    const systemNow = actor?.system?.personal || {};
    const dbNow = systemNow.subjectiveNow;

    let nowAge = (dbNow !== undefined && dbNow !== null && dbNow !== "")
        ? Number(dbNow)
        : (lastHistory?.age || 0);

    if (!Number.isFinite(nowAge)) nowAge = (lastHistory?.age || 0);

    // Physical Stricture: Head cannot be younger than history
    if (lastHistory && nowAge < lastHistory.age) {
        nowAge = lastHistory.age;
    }

    // DIAGONAL AUTHORITY: Final projection of the NOW cursor
    const nowTime = projectObjectiveTime(nowAge, objectiveOffset);

    return {
        levelNodes,
        remainingSpanSeconds: maxSpanPool - spentInCurrentCycle,
        nowNode: {
            age: nowAge,
            time: nowTime,
            type: 'current',
            arrivedVia: (lastHistory?.type === 'span-dest') ? 'span' : 'level',
            eraId: lastHistory?.eraId || null,
            expId: lastHistory?.expId || null
        },
        spanRank: spanLevel
    };
}
