
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Prepares node, link, and group data from the actor sheet.
 * Includes hierarchy calculation via BFS and Timeline range determination.
 */
export function prepareNetworkData(sheet) {
    const rawNodes = Object.values(sheet.actor.system.network || {});
    const rawEdges = Object.values(sheet.actor.system.networkEdges || {});
    const rootId = sheet.actor.id;

    // --- 1. Nodes Setup ---
    let rootImg = sheet.actor.img;
    if (!rootImg || rootImg === "icons/svg/mystery-man.svg") {
        if (sheet.actor.prototypeToken?.texture?.src) {
            rootImg = sheet.actor.prototypeToken.texture.src;
        }
    }
    if (!rootImg) rootImg = "icons/svg/mystery-man.svg";

    const rootName = sheet.actor.system.structure?.orgname || sheet.actor.name;
    const rootNode = {
        id: rootId, name: rootName, img: rootImg,
        isRoot: true, group: "HQ", fx: null, fy: null
    };

    const nodes = [rootNode, ...rawNodes.filter(n => n.id !== rootId).map(d => ({...d}))];

    // --- 2. Links Setup ---
    const links = rawEdges.map(e => ({
        ...e,
        startTime: e.dateFrom ? new Date(e.dateFrom).getTime() : -Infinity,
        endTime: e.dateTo ? new Date(e.dateTo).getTime() : Infinity,
        strength: Number(e.strength) || 1
    })).filter(e => {
        return nodes.find(n => n.id === e.source) && nodes.find(n => n.id === e.target);
    });

    // --- 3. Hierarchy (BFS) ---
    const adjacency = {};
    nodes.forEach(n => adjacency[n.id] = []);
    links.forEach(l => adjacency[l.source].push(l.target));

    const depths = {};
    nodes.forEach(n => depths[n.id] = -1);
    depths[rootId] = 0;
    
    const queue = [rootId];
    const visited = new Set([rootId]);
    let safetyLoop = 0;
    
    while(queue.length > 0 && safetyLoop < nodes.length * 2) {
        const currId = queue.shift();
        const currentDepth = depths[currId];
        const children = adjacency[currId] || [];
        children.forEach(childId => {
            if (!visited.has(childId)) {
                depths[childId] = currentDepth + 1;
                visited.add(childId);
                queue.push(childId);
            }
        });
        safetyLoop++;
    }
    
    nodes.forEach(n => {
        n.depth = depths[n.id] !== -1 ? depths[n.id] : 1;
    });

    // --- 4. Grouping ---
    const groupMap = {};
    nodes.forEach(n => {
        if (n.group && n.group.trim() !== "") {
            const gName = n.group.trim();
            if (!groupMap[gName]) groupMap[gName] = [];
            groupMap[gName].push(n);
        }
    });

    // Auto-include named parents in their own group
    Object.keys(groupMap).forEach(groupName => {
        const parentNode = nodes.find(n => n.name === groupName);
        if (parentNode && !groupMap[groupName].includes(parentNode)) {
            groupMap[groupName].push(parentNode);
        }
    });

    const groups = Object.entries(groupMap).map(([name, members], i) => ({
        id: `group-${name}`,
        members: members,
        color: d3.schemeCategory10[i % 10] 
    }));

    // --- 5. Timeline Range ---
    const inceptionStr = sheet.actor.system.structure?.inceptionDate;
    const inceptionTime = inceptionStr ? new Date(inceptionStr).getTime() : new Date("2000-01-01").getTime();
    const nowTime = Date.now();
    let minTime = inceptionTime;
    let maxTime = nowTime + (31536000000); 

    const savedTimeline = sheet.actor.getFlag('continuum-v2', 'networkTimeline');
    if (savedTimeline?.start && savedTimeline?.end) {
        minTime = savedTimeline.start;
        maxTime = savedTimeline.end;
    } else {
        links.forEach(l => {
            if (l.startTime > -Infinity && l.startTime < minTime) minTime = l.startTime;
            if (l.endTime < Infinity && l.endTime > maxTime) maxTime = l.endTime;
        });
    }

    return { 
        nodes, links, groups, 
        rootId, rootNode, 
        minTime, maxTime, 
        currentViewTime: nowTime 
    };
}
