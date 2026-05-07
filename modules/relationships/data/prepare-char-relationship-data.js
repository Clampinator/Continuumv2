import { createRootNode } from './create-root-node.js';
import { mapNetworkNodes } from './map-network-nodes.js';
import { mapNetworkLinks } from './map-network-links.js';
import { syncRelationshipList } from './sync-relationship-list.js';
import { determineTimelineRange } from './determine-timeline-range.js';
import { clusterNodesIntoGroups } from './cluster-nodes-into-groups.js';

/**
 * Assembles the full relationship graph data package for a character sheet.
 * @param {ActorSheet} sheet 
 * @returns {object}
 */
export function prepareCharRelationshipData(sheet) {
    const actor = sheet.actor;
    
    // 1. Core Structure (Manual Network Nodes and Links)
    const rootNode = createRootNode(actor);
    const nodes = [rootNode, ...mapNetworkNodes(actor)];
    const links = mapNetworkLinks(actor);

    // 2. Automations (Relationship List Sync)
    // This injects "virtual" nodes and links derived from the list tab
    // It also overwrites visual properties of manual nodes if they share identity
    syncRelationshipList(actor, nodes, links);

    // 3. Sanitize: remove links whose source or target node is missing.
    // D3 forceLink throws "node not found" if any link references a node
    // not present in the nodes array. This can happen after a CSV import
    // wipes actor data and stale networkEdges reference deleted nodes.
    const nodeIds = new Set(nodes.map(n => n.id));
    const safeLinks = links.filter(l => {
        const sId = l.source.id ?? l.source;
        const tId = l.target.id ?? l.target;
        return nodeIds.has(sId) && nodeIds.has(tId);
    });

    // 4. Metadata
    const { minTime, maxTime } = determineTimelineRange(actor);
    const groups = clusterNodesIntoGroups(nodes, actor.system.networkGroups || {});

    return { 
        nodes, 
        links: safeLinks, 
        groups, 
        rootId: actor.id, 
        rootNode, 
        minTime, 
        maxTime, 
        currentViewTime: Date.now() 
    };
}
