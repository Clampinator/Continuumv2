import { ReferenceResolver } from '../../../reference-resolver.js';
import { convertTimestampToDateString } from '../../../../../span-graph-utils/provide-span-graph-utils.js';
import { findNextNode } from './find-next-node.js';

/**
 * Automatically generates a reconciliation loop if a span introduces a spacetime fracture.
 * @param {Actor} actor
 * @param {object} params - { mode, eventIsSpan, finalTime, finalAge, authoritativeAge, authoritativeSort, graphData, newId, parentPath }
 * @param {object} updates
 */
export function reconcileSpacetimeDebt(actor, params, updates) {
    const { mode, eventIsSpan, finalTime, finalAge, authoritativeAge, authoritativeSort, graphData, newId, parentPath } = params;
    
    // AUTHORITY: We only reconcile if this event is a Span and NOT the 'Now' node.
    // The 'Now' node (log mode) is allowed to stay in a fracture at the head of the timeline.
    if (!eventIsSpan || mode === 'log') return;

    const dobTs = ReferenceResolver.resolveOrigin(actor);
    const currentOffset = finalTime - (finalAge * 1000);
    
    const nextNode = findNextNode(authoritativeAge, graphData.levelNodes, newId);
    const targetNode = nextNode || graphData.nowNode;
    
    let targetOffset;
    let nextAge;
    let nextSort;

    if (targetNode) {
        targetOffset = targetNode.time - (targetNode.age * 1000);
        nextAge = targetNode.age;
        nextSort = Number(targetNode.sort) || (authoritativeSort + 2000);
        
        if (!nextNode) {
            console.log("Continuum | Blip Protocol | No future historical node found. Using 'Now' node as target anchor.");
        }
    } else {
        // Fallback to birth rail if no target exists at all
        targetOffset = dobTs;
        nextAge = authoritativeAge + 0.1;
        nextSort = authoritativeSort + 2000;
    }

    const fracture = currentOffset - targetOffset;

    // Threshold: 1 second drift
    if (Math.abs(fracture) > 1000) { 
        // Calculate halfway point between this node and the target (Next Node or Now Node)
        const reconcileAge = authoritativeAge + (nextAge - authoritativeAge) / 2;
        
        // Ensure we don't create a zero-length or negative-length gap if ages are identical
        if (reconcileAge <= authoritativeAge) {
            console.warn("Continuum | Blip Protocol | Aborting reconciliation: Insufficient space between nodes.", { reconcileAge, authoritativeAge });
            return;
        }

        const reconcileSort = Math.floor((authoritativeSort + nextSort) / 2);
        const reconcileId = foundry.utils.randomID();
        
        const reconcileOriginTime = currentOffset + (reconcileAge * 1000);
        const reconcileDestTime = targetOffset + (reconcileAge * 1000);
        const rOriginDT = convertTimestampToDateString(reconcileOriginTime);
        const rDestDT = convertTimestampToDateString(reconcileDestTime);

        const reconcileEvent = {
            id: reconcileId,
            eventTitle: "Reconciliation Loop",
            eventNotes: "Automatically generated to settle spacetime debt and preserve upstream history.",
            eventIsSpan: true,
            age: reconcileAge,
            sort: reconcileSort,
            eventSpanFromDate: rOriginDT.date,
            eventSpanFromTime: rOriginDT.time,
            eventSpanToDate: rDestDT.date,
            eventSpanToTime: rDestDT.time,
            createdAt: Date.now()
        };

        updates[`${parentPath}.events.${reconcileId}`] = reconcileEvent;
        console.log(`Continuum | Blip Protocol | Settle Debt: ${fracture}ms | Target: ${nextNode ? 'Node' : 'Now'} | Age: ${reconcileAge} | Sort: ${reconcileSort}`, reconcileEvent);
    }
}
