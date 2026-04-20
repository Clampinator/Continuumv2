import { SPHERE_MAP } from './sphere-visual-registry.js';

/**
 * Auto-imports nodes and links from the "Relationships" sheet tab.
 * Enforces the Relationship list as the Single Source of Truth for Identity and Sphere.
 * @param {Actor} actor 
 * @param {Array} nodes - Current node list (to be mutated).
 * @param {Array} links - Current link list (to be mutated).
 */
export function syncRelationshipList(actor, nodes, links) {
    const rootId = actor.id;
    const relationships = Object.values(actor.system.relationships || {});

    relationships.forEach(rel => {
        if (!rel.name) return;
        
        // 1. NODE SYNC
        // Try to find an existing node by name (Single Source of Truth for Identity)
        let existingNode = nodes.find(n => n.name === rel.name);
        let nodeId = existingNode ? existingNode.id : `rel-${rel.id}`;

        const favorActive = !!(rel.favor?.description && rel.favor?.importance !== 'Done');

        if (!existingNode) {
            // Create new virtual node from list entry
            nodes.push({
                id: nodeId, 
                name: rel.name,
                img: "icons/svg/mystery-man.svg", // Default for relationship list items
                group: rel.importance || "Social",
                relationshipType: rel.relationshipType,
                isAuto: true,
                hasFavor: favorActive
            });
        } else {
            // UPDATE EXISTING: Override graph properties with list data
            existingNode.group = rel.importance || existingNode.group || "Social";
            existingNode.relationshipType = rel.relationshipType || existingNode.relationshipType;
            existingNode.hasFavor = favorActive;
            
            // Mark as auto-linked to prevent manual deletion from the graph context menu
            existingNode.isAuto = true;
        }

        // 2. LINK SYNC
        // Check for link between Root (PC) and this relationship node
        const hasLink = links.some(l => {
            const sId = l.source.id || l.source;
            const tId = l.target.id || l.target;
            return (sId === rootId && tId === nodeId) || (sId === nodeId && tId === rootId);
        });

        if (!hasLink) {
            const props = SPHERE_MAP[rel.importance] || SPHERE_MAP.default;
            links.push({
                id: `auto-${rel.id}`,
                source: rootId,
                target: nodeId,
                relationshipType: rel.relationshipType || "Connection",
                importance: rel.importance,
                isAuto: true,
                startTime: -Infinity,
                endTime: Infinity,
                targetDistance: props.distance,
                linkStrength: props.strength,
                visualWidth: props.width,
                visualOpacity: props.opacity,
                visualColor: props.color
            });
        } else {
            // UPDATE LINK: Ensure visual properties match current Sphere
            const link = links.find(l => {
                const sId = l.source.id || l.source;
                const tId = l.target.id || l.target;
                return (sId === rootId && tId === nodeId) || (sId === nodeId && tId === rootId);
            });
            
            if (link) {
                const props = SPHERE_MAP[rel.importance] || SPHERE_MAP.default;
                link.importance = rel.importance;
                link.targetDistance = props.distance;
                link.linkStrength = props.strength;
                link.visualWidth = props.width;
                link.visualOpacity = props.opacity;
                link.visualColor = props.color;
                link.isAuto = true;
            }
        }
    });
}