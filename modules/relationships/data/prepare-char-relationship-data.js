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

    // 3. Metadata
    const { minTime, maxTime } = determineTimelineRange(actor);
    const groups = clusterNodesIntoGroups(nodes, actor.system.networkGroups || {});

    return { 
        nodes, 
        links, 
        groups, 
        rootId: actor.id, 
        rootNode, 
        minTime, 
        maxTime, 
        currentViewTime: Date.now() 
    };
}
