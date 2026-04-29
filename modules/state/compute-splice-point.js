import { calculateSegments } from '../temporal-engine/calculate-segments.js';
import { resolveCoordinates } from '../temporal-engine/resolve-coordinates.js';
import { findSpliceNeighbors, computeSpliceSort } from '/systems/continuum-v2/modules/temporal-kernel/compute-splice-sort.js';

/**
 * STATE: COMPUTE SPLICE POINT
 * Bridge between the UI (ghost-snap pixel coordinates) and the kernel
 * (world coordinates for displacement math).
 *
 * DELEGATE: Sort computation and neighbor-finding live in
 * temporal-kernel/compute-splice-sort.js. This function only handles
 * segment resolution and data extraction from physical nodes.
 *
 * @param {Object} snapWorld - { eventAge, eventTime } from ghost-snap.
 * @param {Array} physicalNodes - History nodes with physics coordinates.
 * @param {number} originTime - Birth timestamp (ms).
 * @returns {Object} Splice context for insertion initiation.
 */
export function computeSplicePoint(snapWorld, physicalNodes, originTime) {
  const segments = calculateSegments(physicalNodes, originTime);

  // Find the segment containing the click point
  const activeSegment = [...segments].reverse().find(
    s => snapWorld.eventAge >= s.startX && snapWorld.eventAge <= (s.exitPoint ? s.exitPoint.x : Infinity)
  ) || segments[0];

  // Project the click age onto the segment rail to get exact departure
  const departureAge = snapWorld.eventAge;
  const departureTime = resolveCoordinates(departureAge, activeSegment);

  // DELEGATE: Find neighbors using kernel function
  const candidateNodes = physicalNodes.filter(n => !n.isVirtual && !n.isBirth && n.id !== 'now');
  const { beforeNode, afterNode } = findSpliceNeighbors(departureAge, candidateNodes);

  // DELEGATE: Compute insertion sort value using kernel function
  const insertionSort = computeSpliceSort(
    beforeNode ? Number(beforeNode.sort || 0) : null,
    afterNode ? Number(afterNode.sort || 0) : null
  );

  // Find the next event after the splice for floor constraint
  const nextEventTime = afterNode ? Number(afterNode.y || 0) : null;

  return {
    departureAge,
    departureTime,
    insertionSort,
    segmentIndex: segments.indexOf(activeSegment),
    beforeNode: beforeNode ? { id: beforeNode.id, age: Number(beforeNode.x || 0), time: Number(beforeNode.y || 0), isSpanOrigin: Boolean(beforeNode.isSpanOrigin || beforeNode.record?.eventIsSpan) } : null,
    afterNode: afterNode ? { id: afterNode.id, age: Number(afterNode.x || 0), time: Number(afterNode.y || 0) } : null,
    nextEventTime
  };
}