
import { ReferenceResolver } from '../reference-resolver.js';
import { parseDate } from '../../../span-graph-utils/provide-span-graph-utils.js';
import { computeRailOffset } from './compute-rail-offset.js';
import { projectSubjectiveAge, projectObjectiveTime } from '/systems/continuum-v2/modules/temporal-kernel/project-subjective-age.js';

/*
REINDEX LIFELINE NODES (Chronology Authority)
Enforces Age-First ordering to preserve the Diagonal Authority.
*/
export function reindexLifelineNodes(actor, targetNodeId, targetIndex, nodeData = null, options = {}) {
  const system = actor.system;
  const updates = {};
  const stream = [];
  const pendingNodes = options.pendingNodes || [];

  const dobTs = ReferenceResolver.resolveOrigin(actor);

  const _resolveAge = (event) => {
    if (event.eventAge !== undefined && event.eventAge !== null && !isNaN(Number(event.eventAge))) {
      return Number(event.eventAge);
    }

    // FALLBACK: event.eventAge is missing. Recover from date using a two-pass approach:
    // 1) Estimate rough age ignoring spans (date - dob).
    // 2) Compute rail offset at that rough age from actor data alone.
    // 3) Return corrected age using rail offset as the objective base.
    // No graphData dependency - safe to call before the graph exists.
    const dateStr = event.eventIsSpan ? event.eventSpanFromDate : event.eventDate;
    if (dateStr) {
      const timeStr = event.eventIsSpan ? event.eventSpanFromTime : event.eventTime;
      const dateObj = parseDate(`${dateStr}T${timeStr || "12:00:00"}`);
      if (dateObj) {
        const roughAge = projectSubjectiveAge(dateObj.getTime(), dobTs);
        const railBase = computeRailOffset(actor, roughAge);
        return projectSubjectiveAge(dateObj.getTime(), railBase);
      }
    }
    return 0;
  };

  const _resolveSort = (event) => {
    const s = Number(event.sort);
    return Number.isFinite(s) ? s : 0;
  };

  const _resolveTime = (event) => {
    const dateStr = event.eventIsSpan ? event.eventSpanFromDate : event.eventDate;
    const timeStr = event.eventIsSpan ? event.eventSpanFromTime : event.eventTime;
    if (dateStr) {
      const dateObj = parseDate(`${dateStr}T${timeStr || "12:00:00"}`);
      if (dateObj) return dateObj.getTime();
    }
    return 0;
  };

  // 1) Assemble all existing nodes (flattened)
  Object.entries(system.eras || {}).forEach(([eraId, era]) => {
    Object.entries(era.events || {}).forEach(([eventId, event]) => {
      stream.push({
        id: eventId,
        path: `system.eras.${eraId}.events.${eventId}`,
        age: _resolveAge(event),
        time: _resolveTime(event),
        sort: _resolveSort(event),
        created: event.createdAt || 0
      });
    });

    Object.entries(era.experiences || {}).forEach(([expId, exp]) => {
      Object.entries(exp.events || {}).forEach(([eventId, event]) => {
        stream.push({
          id: eventId,
          path: `system.eras.${eraId}.experiences.${expId}.events.${eventId}`,
          age: _resolveAge(event),
          time: _resolveTime(event),
          sort: _resolveSort(event),
          created: event.createdAt || 0
        });
      });
    });
  });

  // Add pending nodes to the stream (nodes not yet in the database but part of this transaction)
  pendingNodes.forEach(node => {
    stream.push({
      id: node.id,
      age: Number(node.age) || 0,
      time: Number(node.time) || 0,
      sort: Number(node.sort) || 0,
      created: node.createdAt || Date.now(),
      isPending: true
    });
  });

  // Milestone 5: Include NOW node in the stream to ensure correct bracketing at the end of the timeline.
  // AUTHORITY: We use the visual "Now" if available, otherwise fallback to database or last event.
  const visualNow = options.graphData?.nowNode;
  const dbNowAge = system.personal?.subjectiveNow;
  const dbNowTime = system.personal?.objectiveNow;
  const lastEventAge = stream.reduce((max, e) => (e.age > max ? e.age : max), 0);
  
  let effectiveNowAge = 0;
  let effectiveNowTime = 0;

  if (visualNow) {
      effectiveNowAge = visualNow.age;
      effectiveNowTime = visualNow.time;
  } else if (dbNowAge !== undefined && dbNowAge !== null && dbNowAge !== "") {
      effectiveNowAge = Number(dbNowAge);
      effectiveNowTime = Number(dbNowTime) || projectObjectiveTime(effectiveNowAge, dobTs);
  } else {
      effectiveNowAge = lastEventAge;
      effectiveNowTime = projectObjectiveTime(effectiveNowAge, dobTs);
  }

  stream.push({
      id: 'now',
      age: effectiveNowAge,
      time: effectiveNowTime,
      sort: 999999999, // NOW is always at the end
      isNow: true
  });

  // 2) Identify target
  const targetIdStr = String(targetNodeId);
  let targetEntry = stream.find(e => String(e.id) === targetIdStr);
  const others = stream.filter(e => String(e.id) !== targetIdStr);

  // AGE-FIRST sorting is canonical for Diagonal Authority.
  // We use Time as a secondary key to ensure stable bracketing during insertions.
  others.sort((a, b) => {
    if (a.age !== b.age) return a.age - b.age;
    
    // AUTHORITY: The "Now" node must always be the absolute end of history for a given age.
    if (a.isNow) return 1;
    if (b.isNow) return -1;

    if (a.time !== b.time) return a.time - b.time;
    
    return ((a.sort || 0) - (b.sort || 0)) ||
           ((a.created || 0) - (b.created || 0)) ||
           String(a.id).localeCompare(String(b.id));
  });

  // 3) Prepare target
  if (!targetEntry) {
    targetEntry = {
      id: targetNodeId,
      age: Number(nodeData?.age) || 0,
      time: Number(nodeData?.time) || 0,
      sort: 0,
      created: Date.now(),
      isTarget: true
    };
  } else {
    targetEntry.isTarget = true;
    if (nodeData?.age !== undefined) targetEntry.age = Number(nodeData.age);
    if (nodeData?.time !== undefined) targetEntry.time = Number(nodeData.time);
  }

  if (!Number.isFinite(targetEntry.age)) targetEntry.age = 0;
  if (targetEntry.age < 0) targetEntry.age = 0;

  // AUTHORITY: Cap insertion coordinates to "Now" to prevent "Future" drift.
  // We use a small epsilon to account for floating point precision in the hover interpolation.
  if (!options.isLog) {
      if (targetEntry.age > effectiveNowAge + 0.001) {
          targetEntry.age = effectiveNowAge;
          targetEntry.time = effectiveNowTime;
      }
  }

  // 4) Find insertion point by AGE and TIME
  let insertAt = others.findIndex(e => {
    // AUTHORITY: If we are inserting into history, we MUST stay before the "Now" node.
    // This prevents precision errors from pushing nodes into the "Future" (after Now).
    if (e.isNow && !options.isLog) return true;

    if (e.age > targetEntry.age) return true;
    if (e.age === targetEntry.age && e.time > targetEntry.time) return true;
    return false;
  });
  if (insertAt === -1) insertAt = others.length;

  others.splice(insertAt, 0, targetEntry);

  // 5) Identify Neighbors for Sorting
  // CRITICAL: We no longer clamp Age between neighbors.
  // The Date/Age entered in the dialog is the Absolute Truth (Diagonal Authority).
  // If multiple nodes have the same Age, the 'sort' property handles their sequence.
  // This prevents "Jumping" regressions in high-density timelines.
  const nextNode = others[insertAt + 1] || null;

  // 6) Assign sort BETWEEN neighbors
  const DEFAULT_STEP = 1000;
  // Use the maximum sort of ALL nodes preceding the insertion point, not just the
  // immediate predecessor. The NOW sentinel has sort 999999999 but real events placed
  // beyond Now get sort > 999999999. Using only the immediate predecessor creates a
  // false floor, so retrospective insertions land below already-existing events.
  let prevSort = null;
  for (let i = 0; i < insertAt; i++) {
      const s = Number.isFinite(others[i].sort) ? others[i].sort : 0;
      if (prevSort === null || s > prevSort) prevSort = s;
  }
  const nextSort = nextNode ? (Number.isFinite(nextNode.sort) ? nextNode.sort : 0) : null;

  let newSort = null;

  if (prevSort !== null && nextSort !== null) {
    if (nextSort - prevSort >= 2) {
      newSort = Math.floor((prevSort + nextSort) / 2);
    } else {
      // Local reindex to make space
      let base = prevSort;
      for (let i = insertAt; i < others.length; i++) {
          base += DEFAULT_STEP;
          const entry = others[i];
          if (entry.isTarget) { newSort = base; entry.sort = base; }
          else if (entry.path) { updates[`${entry.path}.sort`] = base; entry.sort = base; }
      }
    }
  } else if (prevSort !== null && nextSort === null) {
    newSort = prevSort + DEFAULT_STEP;
  } else if (prevSort === null && nextSort !== null) {
    newSort = Math.max(1, nextSort - DEFAULT_STEP);
  } else {
    newSort = DEFAULT_STEP;
  }

  updates.targetSortValue = newSort;
  updates.targetAge = targetEntry.age;
  updates.targetTime = targetEntry.time;

  return updates;
}
