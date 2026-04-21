import { SECONDS_IN_YEAR, parseDate } from './span-graph-utils/provide-span-graph-utils.js';
import { SubwayGenerator } from './lifeline/factory/subway-generator.js';
import { ReferenceResolver } from './lifeline/services/reference-resolver.js';
import { ChronologyAssembler } from './lifeline/services/chronology-assembler.js';
import { LifelineEngine } from './lifeline/services/lifeline-engine.js';
import { SegmentGenerator } from './lifeline/services/segment-generator.js';
import { SpanPool } from './lifeline/calculators/span-pool.js';
import { repairSortOrder } from './lifeline/services/chronology/repair-sort-order.js';

// Per-session guard: each actor is repaired at most once per page load.
const _sortRepairedActors = new Set();

/**
 * Main orchestrator to transform Actor Data into Graph Data.
 */
export function processGraphData(sheet, graphData) {
    const actor = sheet.actor;
    const system = actor.system;

    // 1. INITIALIZATION
    graphData.levelNodes = [];
    graphData.eras = [];
    graphData.experienceSegments = [];
    graphData.yetNodes = [];
    graphData.goalNodes = [];
    graphData.isOrganization = actor.type === 'organization';
    graphData.remainingSpanSeconds = 0;

    // 2. ORIGIN RESOLUTION
    graphData.dobTimestamp = ReferenceResolver.resolveOrigin(actor);

    // 3. SPECIAL MODE: ORGANIZATION SUBWAY
    if (graphData.isOrganization) {
        graphData.tracks = SubwayGenerator.generateTracks(actor);
        return;
    }

    // 4. ASSEMBLY
    const { orderedEvents, sortedEras } = ChronologyAssembler.assembleEventStream(actor);

    // 5. MAPPING ENGINE (Dumb drafting mode)
    const spanLevel = Number(system.spanning?.span) || 0;
    const engineResults = LifelineEngine.calculate(orderedEvents, graphData.dobTimestamp, spanLevel, actor);

    graphData.levelNodes = engineResults.levelNodes;
    graphData.remainingSpanSeconds = engineResults.remainingSpanSeconds;

    // AUTHORITY: If we are in the middle of a Log/Commit operation, or dragging the NOW node,
    // we preserve the drafted position to prevent "Snap-Back" regressions.
    const viewState = sheet._spanGraphContext?.viewState;
    const isCommitting = viewState?.interactionMode === 'dialog-open' ||
                         viewState?.isCommittingLog ||
                         viewState?.interactionMode === 'drag-node';

    if (isCommitting && graphData.nowNode) {
        // Keep the drafted position
    } else {
        graphData.nowNode = engineResults.nowNode;
    }

    graphData.maxSpanPool = SpanPool.getCapacity(spanLevel);

    // 6. STRUCTURAL SEGMENTATION
    graphData.eras = SegmentGenerator.generateEras(sortedEras);
    graphData.experienceSegments = SegmentGenerator.generateExperiences(
        sortedEras,
        graphData.levelNodes,
        graphData.nowNode,
        orderedEvents
    );

    // 7. EXTERNAL NODES (Goals & The Yet)
    Object.entries(system.goals || {}).forEach(([id, g]) => {
        if (g.importance !== "Achieved") graphData.goalNodes.push({ id, description: g.description, importance: g.importance });
    });

    Object.entries(system.theYet || {}).forEach(([id, yet]) => {
        if (yet.done) return;
        const hasAge = yet.age != null && yet.age !== '' && parseFloat(yet.age) > 0;
        const hasDate = !!(yet.date && String(yet.date).trim());
        graphData.yetNodes.push({
            id,
            description: yet.description,
            hasAge,
            hasDate,
            age: hasAge ? parseFloat(yet.age) * SECONDS_IN_YEAR : (graphData.nowNode?.age || 0),
            time: hasDate ? new Date(`${yet.date}T${yet.time || "12:00:00"}`).getTime() : (graphData.nowNode?.time || 0),
            frag: yet.frag || 0,
            isFragSuppressed: !!yet.isFragSuppressed
        });
    });

    // ONE-TIME SORT REPAIR: detect and correct legacy sort/age ordering conflicts.
    // The fix in reindexLifelineNodes prevents new conflicts; this pass corrects
    // data created before that fix. Runs once per actor per page load.
    if (actor.isOwner && !_sortRepairedActors.has(actor.id)) {
        _sortRepairedActors.add(actor.id);
        const sortUpdates = repairSortOrder(actor);
        if (Object.keys(sortUpdates).length > 0) {
            actor.update(sortUpdates);
        }
    }
}

/**
 * Flattens the nested eras -> experiences -> events structure into a single sorted array.
 * Parses dates into timestamps for the Temporal Engine.
 * 
 * @param {Object} eras - The actor.system.eras object.
 * @returns {Array} A sorted array of event objects.
 */
export function flattenEvents(eras) {
  if (!eras) return [];

  const allEvents = [];

  const _parse = (event) => {
    const d = event.isSpan ? event.spanFromDate : event.date;
    const t = (event.isSpan ? event.spanFromTime : event.time) || '12:00:00';
    if (!d) return 0;
    const dt = parseDate(`${d}T${t}`);
    return dt ? dt.getTime() : 0;
  };

  const _parseArrival = (event) => {
    if (!event.isSpan) return 0;
    const d = event.spanToDate;
    const t = event.spanToTime || '12:00:00';
    if (!d) return 0;
    const dt = parseDate(`${d}T${t}`);
    return dt ? dt.getTime() : 0;
  };

  // Iterate through Eras
  Object.entries(eras).forEach(([eraId, era]) => {
    // Collect direct Era events
    if (era.events) {
      Object.entries(era.events).forEach(([id, event]) => {
        allEvents.push({ 
            ...event, 
            id: id, 
            eraId: eraId,
            expId: null,
            time: _parse(event),
            arrivalTime: _parseArrival(event)
        });
      });
    }

    // Collect Experience events
    if (era.experiences) {
      Object.entries(era.experiences).forEach(([expId, exp]) => {
        if (exp.events) {
          Object.entries(exp.events).forEach(([id, event]) => {
            allEvents.push({ 
                ...event, 
                id: id, 
                eraId: eraId, 
                expId: expId,
                time: _parse(event),
                arrivalTime: _parseArrival(event)
            });
          });
        }
      });
    }
  });

  // Sort primarily by Subjective Age, then by Sort value, then by ID
  return allEvents.sort((a, b) => {
    const ageA = Number(a.age) || 0;
    const ageB = Number(b.age) || 0;
    if (ageA !== ageB) return ageA - ageB;

    const sortA = Number(a.sort) || 0;
    const sortB = Number(b.sort) || 0;
    if (sortA !== sortB) return sortA - sortB;

    return (a.id || '').localeCompare(b.id || '');
  });
}
