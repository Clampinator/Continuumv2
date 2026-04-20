
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * BFS from root through the link graph to assign a generation number to every node.
 * Generation 0 = root, 1 = direct contacts, 2 = contacts-of-contacts, etc.
 * Disconnected nodes fall back to generation 1.
 */
function assignGenerations(nodes, links, rootId) {
    // Build undirected adjacency map
    const adj = {};
    for (const l of links) {
        const s = l.source.id ?? l.source;
        const t = l.target.id ?? l.target;
        (adj[s] ??= []).push(t);
        (adj[t] ??= []).push(s);
    }

    const gen = { [rootId]: 0 };
    const queue = [rootId];
    while (queue.length) {
        const curr = queue.shift();
        for (const nb of (adj[curr] ?? [])) {
            if (!(nb in gen)) {
                gen[nb] = gen[curr] + 1;
                queue.push(nb);
            }
        }
    }

    for (const n of nodes) {
        n.generation = gen[n.id] ?? 1;
    }
}

/**
 * Custom force: holds each node at a radial distance from the root
 * proportional to its generation, creating concentric orbit rings.
 * @param {Array} nodes
 * @param {number} cx - Root x (centre of canvas).
 * @param {number} cy - Root y.
 * @param {number} orbitSpacing - Pixels between each generation ring.
 */
function forceGenerational(nodes, cx, cy, orbitSpacing = 160) {
    return function(alpha) {
        for (const node of nodes) {
            if (node.isRoot) continue;
            const targetR = node.generation * orbitSpacing;
            const dx = node.x - cx;
            const dy = node.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const error = dist - targetR;          // +ve = too far, -ve = too close
            const k = 0.12 * alpha;
            node.vx -= (dx / dist) * error * k;
            node.vy -= (dy / dist) * error * k;
        }
    };
}

/**
 * Custom force: pulls nodes that share a group toward their group's centroid,
 * causing them to clump into arcs along their orbit ring.
 * @param {Array} groups
 * @param {number} strength
 */
function forceCluster(groups, strength = 0.15) {
    return function(alpha) {
        for (const group of groups) {
            const members = group.members.filter(n => !n.isRoot && n.x != null);
            if (members.length < 2) continue;
            const cx = members.reduce((s, n) => s + n.x, 0) / members.length;
            const cy = members.reduce((s, n) => s + n.y, 0) / members.length;
            for (const node of members) {
                node.vx -= (node.x - cx) * strength * alpha;
                node.vy -= (node.y - cy) * strength * alpha;
            }
        }
    };
}

/**
 * Creates and configures the D3 force simulation with relationship-based distancing.
 * @param {object} data - The graph data containing nodes and links.
 * @param {number} width - The width of the viewport.
 * @param {number} height - The height of the viewport.
 * @returns {object} The configured D3 simulation instance.
 */
export function configureForceSimulation(data, width, height) {
    const cx = width / 2;
    const cy = height / 2;

    const root = data.nodes.find(n => n.isRoot);
    if (root) { root.fx = cx; root.fy = cy; }

    // Compute generation depth before starting the simulation
    assignGenerations(data.nodes, data.links, root?.id);

    return d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links)
            .id(d => d.id)
            .distance(d => d.targetDistance || 160)
            .strength(d => (d.linkStrength || 0.7) * 0.4)  // soften links so orbital force shapes the layout
        )
        .force("charge", d3.forceManyBody().strength(-600))
        .force("collide", d3.forceCollide().radius(60))
        .force("center", d3.forceCenter(cx, cy).strength(0.03))
        .force("generational", forceGenerational(data.nodes, cx, cy, 160))
        .force("cluster", forceCluster(data.groups, 0.15));
}
